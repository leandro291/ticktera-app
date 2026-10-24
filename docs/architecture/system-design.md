# System design

Arquitectura de Ticktera: componentes, ambientes, autenticación y roles, pagos y flujo de compra. El design system visual está en [`../design-system.md`](../design-system.md) y el modelo de datos en [`./mer.md`](./mer.md).

---

## 1. Componentes y ambientes

### Diagrama de componentes

```
Browser ─► Next.js 16 (App Router, Server Actions + route handlers)
             ├─► Clerk            identidad (email/password + Google social login)
             │     └─► Google     OAuth 2.0 / OIDC, solo vía Clerk (la app no habla con Google)
             ├─► Postgres         vía Drizzle ORM (Neon local / Cloud SQL prod)
             ├─► Stripe           cobro con tarjeta + webhooks
             ├─► Vercel Blob      portadas de eventos (store público, solo desde el servidor)
             └─► Google Maps      solo prod: mapa y autocompletar de dirección
```

### Local vs producción

| Pieza    | Local                                                   | Producción                                                    |
| -------- | ------------------------------------------------------- | ------------------------------------------------------------- |
| App      | `next dev` en `localhost:3000`                          | Cloud Run, contenedor Next.js `standalone`                    |
| BD       | Neon, branch de desarrollo                              | Cloud SQL Postgres, conector nativo por socket                |
| Clerk    | Instancia `development`                                 | Instancia `production`                                        |
| Google OAuth | Credenciales compartidas de Clerk (instancia `development`), sin configurar nada en Google | Cliente OAuth propio en Google Cloud Console, cargado en el dashboard de Clerk |
| Stripe   | Modo test + Stripe CLI reenviando webhooks a localhost  | Modo live, endpoint público en Cloud Run                      |
| Maps     | Apagado: la dirección es texto plano                    | Activo, API key restringida por dominio                       |
| Blob     | Store público `ticktera-covers` (proyecto Vercel `ticktera-app`) | Store propio de producción (se crea al decidir el hosting) |
| Secretos | `.env.local`                                            | Secret Manager montado como env vars en Cloud Run             |

### Reglas

- **Mismo Postgres en ambos lados.** Neon y Cloud SQL son Postgres: mismo schema y migraciones, solo cambia `DATABASE_URL`. Misma versión mayor de Postgres en los dos.
- **Un solo driver.** `pg` con `drizzle-orm/node-postgres` para Neon y Cloud SQL.
- **Variables validadas con Zod en un único `lib/env.ts`.** Si falta una, la app no arranca. Hoy valida `DATABASE_URL`, `SUPER_ADMIN_EMAIL` (opcional), `BLOB_READ_WRITE_TOKEN` (opcional: sin él solo falla la subida de portadas, 503) y las de Stripe y del job de vencimiento (todas opcionales, con validación de formato; ver la tabla); cada integración agrega las suyas cuando se implemente. Las claves de Clerk no pasan por `lib/env.ts`: el SDK las lee de `process.env`, así que su ausencia no rompe `next build` ni `proxy.ts`.
- **Maps se enciende por presencia de su key.** Sin key, el formulario de evento degrada a texto y `lat`/`lng` quedan nulos.
- **Migraciones con `drizzle-kit`.** En producción se corren como paso del pipeline (Cloud Build), nunca desde la app.
- **CI/CD y Terraform:** solo descritos acá, fuera de alcance de esta spec.

### Variables de entorno por ambiente

| Variable                              | Tipo    | Local                          | Producción                    | Notas                                          |
| ------------------------------------- | ------- | ------------------------------ | ----------------------------- | ---------------------------------------------- |
| `DATABASE_URL`                        | secreta | Neon (branch dev)              | Cloud SQL (socket)            | Obligatoria, validada en `lib/env.ts`          |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`   | pública | Clerk development              | Clerk production              |                                                |
| `CLERK_SECRET_KEY`                    | secreta | Clerk development              | Clerk production              | Backend API: espejo de rol, ban/unban y alta de staff desde el panel. La lee el SDK, no `lib/env.ts` |
| `CLERK_WEBHOOK_SIGNING_SECRET`        | secreta | Endpoint local (túnel)         | Endpoint de Cloud Run         | Verifica `POST /api/webhooks/clerk`. Opcional en local (rige el sync perezoso), obligatoria en prod |
| `STRIPE_SECRET_KEY`                   | secreta | `sk_test_…`                    | `sk_live_…`                   | Opcional en `lib/env.ts` (formato `sk_test_`/`sk_live_`; mismo modo que la publicable, si no la app no arranca). Sin ella `getStripe()` lanza `PaymentsNotConfiguredError`: la acción de checkout responde `payment-unavailable` y el webhook 503 (falla cerrada) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`  | pública | `pk_test_…`                    | `pk_live_…`                   | Opcional en `lib/env.ts` (formato `pk_test_`/`pk_live_`). La usa el Payment Element del navegador |
| `STRIPE_WEBHOOK_SECRET`               | secreta | Lo entrega Stripe CLI          | Endpoint live de Stripe       | Verifica `POST /api/webhooks/stripe`. Opcional en `lib/env.ts` (formato `whsec_`); sin él el webhook responde 503 |
| `INTERNAL_JOB_SECRET`                 | secreta | `openssl rand -hex 32`         | Ausente                       | Opcional, mínimo 32 caracteres. Modo local de `POST /api/internal/expire-orders` (`Authorization: Bearer`) |
| `EXPIRE_ORDERS_AUDIENCE`              | config  | Ausente                        | URL del endpoint (a definir al desplegar) | Opcional (URL). Audiencia esperada del token OIDC de Cloud Scheduler. Va junto con la siguiente |
| `EXPIRE_ORDERS_SERVICE_ACCOUNT`       | config  | Ausente                        | Cuenta de servicio de Cloud Scheduler (a definir al desplegar) | Opcional (email). `email` esperado en el token OIDC. Sin secreto ni este par completo, el endpoint responde 503 |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`     | pública | Ausente (Maps apagado)         | Restringida por dominio       | Opcional: su presencia enciende Maps           |
| `BLOB_READ_WRITE_TOKEN`               | secreta | `.env.local` (`vercel env pull`) | Store de producción         | Opcional en `lib/env.ts`. Sin token, `POST/DELETE /api/events/[id]/cover` responde 503 y el resto del CRUD funciona |
| `SUPER_ADMIN_EMAIL`                   | secreta | Email del primer super admin   | Email del primer super admin  | Opcional. La lee el sync Clerk → `users` (webhook y sync perezoso): el email verificado que coincide recibe `super_admin`. Vacío o ausente = sin super admin |

`NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` y `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up` también se cargan (rutas propias de la app). Las `NEXT_PUBLIC_*` viajan al navegador: nunca van claves secretas con ese prefijo.

El Client ID y Client Secret de Google **no son env vars de la app**: se cargan en el dashboard de Clerk (Configure → SSO connections → Google). La app solo conoce las claves de Clerk.

---

## 2. Autenticación y roles

Clerk maneja login, registro, sesión y los proveedores sociales. Se ofrecen dos formas de entrar: **email/password** y **"Continuar con Google"** (social connection de Clerk). **La app nunca guarda contraseñas ni tokens de Google.**

### Login con Google

1. El usuario pulsa "Continuar con Google" (componentes de Clerk o `signIn.authenticateWithRedirect({ strategy: 'oauth_google' })`).
2. Clerk redirige a Google y recibe el callback OAuth. Scopes mínimos: `openid`, `email`, `profile`. Sin acceso a Drive, Calendar ni otros datos.
3. Clerk crea o recupera el usuario y abre la sesión. Si es la primera vez, emite `user.created` y el webhook crea la fila en `users` (ver abajo).
4. Registro e inicio de sesión son el mismo botón: no hay pantalla distinta para "registrarse con Google".

**Configuración en Google Cloud Console (solo producción):**

- Crear un OAuth Client ID tipo *Web application*.
- *Authorized redirect URI*: el que muestra el dashboard de Clerk al activar Google (no se inventa a mano).
- *OAuth consent screen* en estado *In production*, con nombre de marca, dominio y política de privacidad. Con los scopes mínimos no requiere verificación sensible.
- Copiar Client ID y Secret al dashboard de Clerk.

En local no se configura nada: la instancia `development` de Clerk usa credenciales compartidas.

**Mapeo Google → `users`** (el webhook lee el payload de Clerk):

| Campo en `users` | Origen                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| `clerk_user_id`  | `id` del usuario de Clerk (no el `sub` de Google; ese lo guarda Clerk en `external_accounts`).  |
| `email`          | Email primario de Clerk. Google siempre lo entrega verificado.                                  |
| `full_name`      | `first_name` + `last_name`. Si Google no los entrega, parte local del email.                    |

La foto de perfil de Google no se guarda en la BD: se lee de Clerk (`user.imageUrl`) cuando la UI la necesite.

**Cuenta con mismo email por dos vías:** si alguien se registró con email/password y luego entra con Google (o al revés) con el mismo email verificado, Clerk los resuelve como un solo usuario. Hay una sola fila en `users`. Confirmar el comportamiento exacto de vinculación al implementar.

### Clerk → `users`

Dos caminos, una misma función (`syncClerkUser`, upsert por `clerk_user_id`):

1. **Webhook** de Clerk (`user.created`, `user.updated`, `user.deleted`) en `POST /api/webhooks/clerk`, verificado con `verifyWebhook` (firma inválida → 400; error de BD o Clerk → 500 para que Clerk reintente). Es el camino principal.
2. **Sync perezoso** en `getCurrentUser()` (`modules/auth/server.ts`): si hay sesión y aún no hay fila en `users`, lee el usuario de la Backend API de Clerk y hace el upsert. Permite trabajar en local sin túnel y cubre el primer ingreso del super admin. Con fila existente devuelve la fila sin llamar a Clerk. Webhook y sync pueden correr a la vez: el segundo es no-op.

| Evento         | Efecto en `users`                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| `user.created` | Crea la fila: `clerk_user_id` (único), email, nombre; `role = customer`, o `super_admin` si aplica A2. Espeja `publicMetadata.role` a Clerk (también para `customer`). Teléfono y documento quedan nulos hasta el checkout. |
| `user.updated` | Actualiza email y nombre. No toca `role` ni `status`.                                                          |
| `user.deleted` | **No borra la fila**: queda `suspended` y se conservan sus órdenes.                                            |

Solo se persiste el email primario **verificado** (`primary_email_address_id`); si no lo está, no se crea la fila. El sync nunca cambia el rol por datos del payload de Clerk ni degrada un rol existente.

La compra exige cuenta, así que el documento y el celular del checkout se guardan en el perfil.

### Rol: fuente de verdad y espejo

`users.role` en Postgres es la verdad (`super_admin | admin | organizer | customer`). Cada cambio de rol es una Server Action que:

1. actualiza `users.role` en la BD;
2. luego copia el valor a Clerk `publicMetadata.role`.

En ese orden. Si falla la copia a Clerk, la acción falla y se reintenta (el reintento es idempotente: espeja aunque la BD ya coincida). El primer sync espeja el rol también para `customer`, así que un claim ausente significa "aún sin sincronizar" y no "cliente".

**Suspender / reactivar** sigue el mismo orden: `users.status` primero, luego `banUser` / `unbanUser` en Clerk.

### Permisos

Los permisos se derivan del rol con un mapa en código (`ROLE_PERMISSIONS` en `modules/auth/lib/permissions.ts`, con `can(role, permission)` y `parseRole`), sin tabla `permissions` ni overrides por usuario: con 4 roles fijos y la matriz de abajo no se justifica. "El super admin maneja permisos" significa que asigna roles. Si aparece un permiso por usuario, ahí sí se migra a tabla.

### Claims de sesión

Para que el proxy vea el rol hay que configurar en el dashboard de Clerk (Sessions → Customize session token):

```json
{ "metadata": "{{user.public_metadata}}" }
```

El rol llega en `sessionClaims.metadata.role`. Si falta (token viejo o dashboard sin configurar), el proxy deja pasar a quien tenga sesión y la capa 2 decide.

### Autorización en dos capas

1. **Proxy de Next (`proxy.ts`):** bloquea por prefijo de ruta según la matriz leyendo el rol de los claims de sesión, sin tocar la BD (no importa `db` ni `lib/env`). Sin sesión en una ruta protegida redirige a `/sign-in` con retorno; con rol insuficiente redirige a `/`.
2. **Server Action / route handler / layout:** revalida rol, estado y propiedad contra la BD con `requirePermission(permission)` (acciones y handlers; lanza `AuthorizationError`: `unauthenticated` | `suspended` | `forbidden`) o `requirePagePermission(permission)` (layouts y páginas; redirige a `/sign-in` o `/`). Ej.: `event.organizer_id === user.id`. Un usuario `suspended` no pasa aunque su sesión siga vigente.

Los claims solos nunca alcanzan para acciones sensibles. Entradas del módulo: `modules/auth/index.ts` (puro, seguro para el cliente) y `modules/auth/server.ts` (BD y Clerk Backend).

> Nota: en Next 16 el `middleware` puede llamarse `proxy`. Verificar en `node_modules/next/dist/docs/` antes de implementar.

### Matriz de acceso

| Zona                                          | Quién entra                                                      |
| --------------------------------------------- | ---------------------------------------------------------------- |
| Público (landing, búsqueda, detalle de evento) | Todos, sin sesión                                                |
| Checkout y "Mis entradas"                     | Todo usuario logueado                                            |
| Panel de organizador                          | `organizer` y, para soporte, `admin` y `super_admin`             |
| Panel de administración                       | `admin`, `super_admin`                                           |
| Gestión de administradores y ajustes globales | Solo `super_admin`                                               |
| Eventos propios con ventas (`events:read-own`) | `organizer`, `admin`, `super_admin`                             |
| Eventos de todos con ventas (`events:read-all`) | `admin`, `super_admin`                                         |
| CRUD de eventos propios (`events:manage-own`) | `organizer`, `admin`, `super_admin`                              |
| Moderar eventos ajenos (`events:moderate`)    | `admin`, `super_admin`                                           |

Rutas protegidas por el proxy: `/checkout` y `/my-tickets` (cualquier sesión), `/organizer`, `/admin` (reservada, sin UI todavía) y `/super-admin`. `/sign-in`, `/sign-up` y `/api/webhooks/clerk` nunca se bloquean. `/api/events` tampoco está en las reglas del proxy: su única barrera es la capa 2, dentro del handler.

### Listado de eventos (`GET /api/events`)

`GET /api/events?scope=mine|all|published`. El cliente pide una **vista** y el servidor decide si se la da: el `organizer_id` sale siempre de `requirePermission` (la fila de la BD), nunca de la query. Cualquier otro parámetro (por ejemplo `organizerId`) se descarta y no se lee; si `scope` se repite, vale el primero.

| `scope`     | Permiso            | Qué devuelve                                                                                   |
| ----------- | ------------------ | ---------------------------------------------------------------------------------------------- |
| `mine`      | `events:read-own`  | Eventos del usuario de la sesión, con ventas. También para `admin` y `super_admin` (ven los suyos). |
| `all`       | `events:read-all`  | Eventos de todos los organizadores, con ventas. Solo `admin` y `super_admin`.                  |
| `published` | ninguno (público)  | Eventos `published`, **sin** ventas: no se consultan `order_items` ni `orders`.                |

Pedir un alcance sin permiso nunca se degrada en silencio a otro: responde 403. Los ítems no incluyen `organizerId`, email, códigos de orden ni datos de compradores.

| Código | Cuerpo                            | Cuándo                                                                   |
| ------ | --------------------------------- | ------------------------------------------------------------------------ |
| 200    | `{ items }`                       | OK. En `mine` y `all` lleva `Cache-Control: private, no-store`.          |
| 400    | `{ error: "invalid-query" }`      | `scope` ausente o fuera de `mine \| all \| published`.                   |
| 401    | `{ error: "unauthenticated" }`    | Sin sesión en `mine` o `all`.                                            |
| 403    | `{ error: "suspended" \| "forbidden" }` | Usuario `suspended`, o rol sin el permiso del alcance (`customer` en `mine`, `organizer` en `all`). |
| 500    | `{ error: "internal" }`           | Falla de BD u otro error; el detalle va solo a `console.error`.          |

Una sola consulta por request: una fila por (evento × tipo de entrada), agregada en SQL y plegada a eventos en TypeScript. Definiciones de las métricas en `mer.md` ("Reglas de negocio derivadas del modelo").

**Cliente.** `useEvents(scope)` (`modules/event`, TanStack Query) llama a este endpoint con query key `["events", scope, owner]`, donde `owner` es el `userId` de Clerk en `mine`/`all` y `"public"` en `published`. Así un segundo usuario en la misma pestaña no reusa la caché del anterior; la key es solo de caché y el servidor la ignora. En privados queda deshabilitado hasta que Clerk cargó y hay `userId`. Los 400/401/403 no se reintentan. `QueryProvider` se monta en el layout raíz dentro de `ClerkProvider`.

### Catálogo público (`specs/events/real-catalog-and-selection.md`)

La landing, `/events`, `/events/[slug]`, `/events/[slug]/tickets` y `/checkout?event=<slug>` leen de la BD con `listUpcomingEvents` / `getPublicEvent` (`modules/event/server.ts`) y `getEventZones` (`modules/purchase/server.ts`). Solo eventos `published` con `starts_at > now()`; cualquier otro (o un slug inexistente) da 404. El slug es la clave pública de las rutas y del carrito. Una consulta por pantalla trae eventos, zonas y agregados de cupo (sin datos de compradores); los filtros de búsqueda corren en el cliente (techo ~500 eventos). Se vende por zona y cantidad: el mapa de zonas se genera solo a partir de los tipos de entrada y la cantidad por zona va de 0 a `min(max_per_order, cupo)`. El checkout cobra con Stripe (ver §3).

### Panel de super admin

`/super-admin/users` (permiso `users:manage-roles`, solo `super_admin`) lista nombre, email, rol, estado (solo organizadores) y fecha de alta, y permite:

- **Buscar, filtrar y paginar** (por nombre o correo, rol y estado de organizador). Todo del lado cliente: `listUsers` trae la lista completa y se filtra en memoria, sin search params ni TanStack Table (techo ~1000 filas; después, mover a servidor). Tabla en escritorio, tarjetas en móvil.
- **Invitar** un `admin` u `organizer` (solo correo y rol). Si el correo **no existe** en `users`, se crea una invitación de Clerk (`clerkClient().invitations.createInvitation`) con `publicMetadata.role` y `redirectUrl` = `<origen de la acción>/sign-up`; Clerk envía el correo. No se crea usuario ni fila hasta que la persona acepta: `<SignUp />` consume el ticket y el sync (`user.created` o perezoso) crea la fila tomando el rol de `publicMetadata` solo si la fila es nueva y el rol es `admin` u `organizer` (`publicMetadata` solo la escribe el backend). Las invitaciones pendientes se gestionan en el Dashboard de Clerk. Si el correo **ya existe**, no se invita: se cambia su rol con las mismas reglas que "Editar".
- **Editar** nombre, rol y, si es organizador, estado (aprobado / suspendido) en una sola acción. Orden BD → Clerk: un único `UPDATE` en `users` y luego nombre, espejo del rol y `banUser` / `unbanUser`. Si Clerk falla, la acción falla con la BD ya actualizada; reenviar el formulario repite las llamadas, que son idempotentes (no se condicionan a "cambió en BD"). El eco `user.updated` es inocuo: el sync solo escribe email y nombre.
- **Suspender / reactivar** a un organizador desde la lista, con el orden de "Rol: fuente de verdad y espejo".
- **Eliminar** a un usuario sin datos asociados. Una transacción de BD envuelve a Clerk: `DELETE FROM users` → `clerkClient().users.deleteUser` → commit. El chequeo es la propia FK (`events.organizer_id`, `orders.user_id`, sin cascade): si hay eventos u órdenes, Postgres lanza `23503` y no se llama a Clerk. Si Clerk falla, la transacción revierte y la fila sigue; un 404 de Clerk (ya borrado) cuenta como éxito, así que el reintento converge. Con datos asociados no se puede eliminar: se suspende al organizador en su lugar.

Reglas: hay un único `super_admin`; el panel no lo asigna, no lo modifica ni lo elimina, y nadie cambia su propio rol, se suspende ni se elimina a sí mismo (las filas propias y de `super_admin` se muestran con candado y sin acciones). Un organizador `suspended` no puede cambiar de rol hasta reactivarlo, para no dejar suspendidos sin indicador visible. Todas las Server Actions validan con Zod y llaman a `requirePermission("users:manage-roles")` antes de tocar BD o Clerk. El panel no tiene link en el header: se entra por URL.

### Supuestos

- **A1** Cliente → organizador por autoservicio con el botón "Vender entradas" (alternativa: aprobación de admin).
- **A2** El primer `super_admin` se asigna en el sync Clerk → `users`: si el email primario **verificado** (case-insensitive) coincide con `SUPER_ADMIN_EMAIL`, la fila nace con `super_admin`. No hay seed de usuarios (`users.clerk_user_id` es NOT NULL y la fila solo existe cuando la persona ya se registró en Clerk). El sync nunca degrada un rol existente: si `SUPER_ADMIN_EMAIL` cambia, el anterior conserva `super_admin` hasta cambiarlo a mano. Después el super admin crea administradores y organizadores y gestiona sus roles desde el panel.
- **A3** `admin` modera eventos (suspender, reactivar, cancelar con `events:moderate`) y suspende usuarios, pero no cambia roles ni edita contenido ajeno.

### CRUD de eventos

Spec: `specs/organizer/event-crud.md`. El organizador gestiona **sus** eventos desde `/organizer` (crear, editar, publicar, despublicar, cancelar, eliminar) y `admin`/`super_admin` los moderan desde `/admin/events`.

- **Escritura por Server Actions** (`modules/event/actions/event-actions.ts`): `saveEventAction`, `transitionEventAction`, `moderateEventAction`, `deleteEventAction`. Orden: `requirePermission` → Zod (descarta `organizerId`, `status`, `slug`, `publishedAt`, `coverImageUrl`) → servicio. La propiedad va dentro del SQL (`WHERE id = $1 AND organizer_id = $actor`); ajeno e inexistente dan el mismo `not-found`.
- **Estados** (`allowedActions`): `draft → published` (dueño), `published → draft` solo sin ventas comprometidas, `published → cancelled` (dueño o moderador), `published ↔ suspended` (moderador), `suspended → cancelled` (moderador). `cancelled` es terminal. Un `suspended` no ofrece nada al dueño. Despublicar **conserva** `published_at`: el slug es inmutable desde la primera publicación.
- **Congelamiento con ventas** (paid o pending vigente): precio y nombre fijos, capacidad ≥ comprometido, no se quita el tipo. Cambiar fecha, hora o lugar exige confirmación explícita (`acknowledgeBuyerImpact`) y queda en el log de auditoría. Un tipo con cualquier `order_items` no se borra (FK).
- **Concurrencia**: guardar, transicionar y eliminar bloquean la fila del evento y sus `ticket_types` (`FOR UPDATE`) antes de leer ventas, el mismo lock que toma "crear orden". Edición optimista con `updated_at` (`stale`).
- **Eliminar**: `DELETE` real sin "contar y luego borrar": la FK `order_items → ticket_types` (sin cascade) da `23503` → `has-orders` y se ofrece cancelar.
- **Portada**: `POST|DELETE /api/events/[id]/cover` (route handler, `multipart/form-data`). Valida MIME, magic bytes (JPEG/PNG/WebP, sin SVG ni GIF) y tamaño (≤ 2 MiB → 413), sube a Vercel Blob con nombre aleatorio y guarda solo la URL. La portada anterior se borra best-effort tras confirmar la BD. Rechaza `Sec-Fetch-Site: cross-site`.
- **Auditoría**: `console.info({ evt: "event.audit", action, eventId, actorId, from, to, ack })` en cada mutación, sin PII ni tabla.
- **Huecos conocidos**: cancelar con ventas no reembolsa ni avisa a los compradores (spec de reembolsos y de emails pendientes); los eventos de un organizador suspendido siguen a la venta hasta que un moderador los suspenda.

### Seed de eventos

`npm run db:seed -- --organizer <email>` (o `SEED_ORGANIZER_EMAIL`) carga categorías, eventos y tipos de entrada del mockdata, asociados a un usuario existente con rol `organizer` y estado activo. Es idempotente (upsert por `slug` y por `(event_id, name)`), no pisa `status` ni `published_at` de eventos ya existentes y se niega a correr con `NODE_ENV=production`. Omite `evt-006` (EUR) y `evt-007` (USD) porque el modelo es solo `PEN`. No crea usuarios, órdenes ni pagos.

---

## 3. Pagos y flujo de compra

Stripe `PaymentIntent` con **Payment Element embebido**, solo `card`, moneda `PEN` (el artifact tiene el formulario de tarjeta dentro de la página). Yape y PagoEfectivo del artifact quedan fuera de alcance. **Solo cobra la plataforma:** sin Connect, comisiones ni payouts. **Se vende por zona y cantidad**, sin elegir butaca (ver mer.md, "Fuera del modelo por decisión").

### Cuenta de Stripe (verificado el 2026-10-09)

- **Perú no es país soportado** para abrir una cuenta de Stripe (stripe.com/global). La cuenta de la plataforma es de **EE.UU.**: en producción, una empresa en EE.UU. (LLC, por ejemplo vía Stripe Atlas), a crear antes del lanzamiento. En desarrollo se usa el sandbox de EE.UU. ya creado.
- **`PEN` es moneda de presentación** para cuentas de EE.UU. (`country_specs/US`): el cliente ve y paga en soles. Probado en el sandbox con Visa y Amex (`succeeded`).
- **No se liquida en `PEN`**: Stripe convierte a USD al acreditar. La BD guarda montos en céntimos de `PEN` (lo que paga el cliente); el neto en USD solo vive en Stripe.
- **Comisión estándar de EE.UU.** con tarjeta peruana: 2,9 % + USD 0,30, + 1,5 % por tarjeta internacional, + 1 % por conversión (≈ 5,4 % + USD 0,30). El mínimo por cobro lo fija la moneda de liquidación (USD).

### Flujo

1. **Crear orden** (Server Action `startCheckoutAction`; dos pasos en `/checkout`: datos del comprador y luego Payment Element). Primero una transacción:
   - `pg_advisory_xact_lock` por (usuario, evento): serializa dos compras paralelas del mismo usuario. Solo lo toma el checkout.
   - Una reserva vigente por usuario y evento: las `pending` vigentes propias de ese evento pasan a `expired` (y sus `payments` pendientes a `failed`).
   - `SELECT … FOR UPDATE` sobre las filas de `ticket_types` del evento, en orden de `id` (el CRUD de eventos bloquea en el mismo orden). Orden de locks fijo, también en el webhook: `orders` → `ticket_types`.
   - Después del lock, leer `events` y exigir `status = 'published'` y `starts_at > now()`: un evento cancelado o suspendido no vende (punto de integración del CRUD de eventos, D19).
   - Disponibilidad = `capacity − vendidas − pendientes vigentes` (pendiente vigente: `status = pending` y `expires_at > now()`).
   - Insertar la orden `pending` con `expires_at = now() + 15 min` (reloj de la BD) y los `order_items` con precio congelado. El código es `TK-` + 5 caracteres de un alfabeto sin ambiguos (`crypto.randomInt`), con reintento ante choque. Guardar nombre, celular y documento en `users`.

   **Después del commit** (no durante el lock de `ticket_types`: no se sostiene un lock durante una llamada HTTP a Stripe):
   - Crear el PaymentIntent: solo `card` (`allowed_payment_method_types`), `PEN`, `metadata.order_id` y clave de idempotencia = id de la orden. Registrar la fila en `payments`.
   - Cancelar, best-effort, los PaymentIntents de las reservas que se liberaron.
   - Si Stripe falla o no está configurado, la orden se vence en el acto (libera el cupo) y la acción responde `payment-unavailable`.
2. **Confirmar:** el cliente confirma con Payment Element y vuelve a `/checkout/confirmation?code=TK-…`. La página lee la orden de la BD y se refresca mientras sea `pending`. El navegador nunca decide si el pago fue exitoso.
3. **Webhook `payment_intent.succeeded`** (`POST /api/webhooks/stripe`; cuerpo crudo, firma verificada): orden → `paid`, crear las entradas (una fila por unidad, código de 12 caracteres aleatorios único, es el contenido del QR, ver «Entradas, QR y Mis entradas»; reintento ante choque) y actualizar el pago con marca y últimos 4. Idempotente vía `stripe_events` (PK = `event.id` de Stripe), registrado en la misma transacción que los efectos: si algo falla se revierte todo y Stripe reintenta. Respuestas: 503 sin clave o secreto, 400 sin firma o inválida, 500 si falla el manejador, 200 en el resto. Se ignora (200) un evento de otro tipo, un PaymentIntent sin fila en `payments` o con `metadata.order_id` distinto del de la fila. Si el monto recibido no coincide con el de la orden no se emite nada, no se registra el evento y se loguea para revisión manual.
   - **Pago tardío (A5):** si la orden está `expired`, o `pending` con `expires_at` ya pasado (el job puede no haber corrido), se honra solo si todos sus tipos tienen cupo y el evento sigue vendible (`published` y futuro). Si no, reembolso automático dentro de la transacción (`idempotencyKey` = `auto-refund:<orderId>`), `payments` → `refunded` y la orden queda `expired`, sin entradas. Un pago a tiempo se honra siempre, aunque el evento se haya cancelado después.
   - Nunca se emiten entradas sobre un cargo ya reembolsado en Stripe (se lee antes de la transacción).
4. **Vencimiento:** Cloud Scheduler llama cada minuto a `POST /api/internal/expire-orders` (autenticación en "Endpoints internos"). Marca `expired` hasta 200 órdenes vencidas por llamada (`FOR UPDATE SKIP LOCKED`), pasa sus `payments` pendientes a `failed` y, tras el commit, cancela sus PaymentIntents (un error de Stripe se registra y no aborta el lote). Responde `{ expired, cancelledIntents }`. El cálculo de disponibilidad ignora las vencidas aunque el job no haya corrido.
5. **Reembolso** (pendiente, #23): solo `admin` / `super_admin`, vía API de Stripe. El webhook `charge.refunded` marcará la orden `refunded` y pasará sus entradas a `void` en la misma transacción ("Mis entradas" ya lista las órdenes `refunded`). Hoy el webhook solo maneja `payment_intent.succeeded` e ignora `charge.refunded`.

### Entradas, QR y "Mis entradas"

- **Lectura desde la BD.** `/my-tickets` (`requirePagePermission("checkout:buy")`; el `userId` sale de la sesión) llama a `listMyOrders(userId)`, que lee `orders` × `order_items` × `tickets` en una sola consulta compartida con `getOrderByCode`. El dueño se filtra **dentro del SQL** (`orders.user_id`): no hay forma de traer entradas ajenas. Lista solo órdenes `paid` y `refunded`, la compra más reciente primero; `pending` y `expired` nunca aparecen. Una orden sin filas en `tickets` no se lista. No hay paginación. La confirmación de compra y "Mis entradas" salen de esta misma lectura y del mismo mapper (`toOrder`); no queda ningún dato de ejemplo ni órdenes en el navegador.
- **Próximas y pasadas.** Por la fecha de Lima de `events.starts_at`: próxima si es hoy o después (el día del evento entero cuenta, no hay `ends_at`). "Hoy" lo calcula el servidor en hora de Lima y se pasa a la página.
- **Qué muestra cada entrada.** El estado sale de la BD en cada carga. Solo una entrada `valid` de un evento próximo muestra QR y código; `used` ("Usada"), `void` ("Anulada") y las de eventos pasados ("Evento finalizado") se ven con su texto y **sin QR**. El PDF trae una página por entrada `valid` (la UI de Mis entradas no ofrece el PDF de eventos pasados) y la confirmación muestra el QR de la primera.
- **Contenido del QR = solo `tickets.code`** (12 caracteres, QR real nivel M, versión 1 de 21×21, con zona de silencio de 4 módulos; el mismo helper `qrMatrix` dibuja pantalla y PDF). Sin firma ni URL. El código es un **secreto portador**: quien lo tiene entra, una vez. Se prescinde de firma porque el control real del check-in (#24) es la transición atómica `valid → used` contra la BD (p. ej. `UPDATE … WHERE code = $1 AND status = 'valid'`): una firma solo serviría para validar sin conexión y no evita que alguien fotografíe el QR; eso lo corta el estado `used`. El código no se loguea ni viaja en URLs.
- **Contrato para #24.** El escáner o el ingreso manual normaliza (mayúsculas, sin espacios ni guiones), consulta por código exacto y la Server Action de check-in (`checkInTicketAction`) limita los intentos fallidos por usuario.
- **Estado local del navegador.** Solo el carrito persiste en localStorage (`ticketera:cart`: borrador previo al login; la reserva real empieza en "Continuar al pago"). Las órdenes ya no se guardan allí; la clave vieja `ticketera:orders` se borra al montar la app.

### Endpoints internos

| Endpoint                            | Quién llama        | Autenticación                      | Estado                             |
| ----------------------------------- | ------------------ | ---------------------------------- | ---------------------------------- |
| `POST /api/webhooks/clerk`          | Clerk              | Firma (`verifyWebhook`)            | Implementado                       |
| `POST /api/webhooks/stripe`         | Stripe             | Firma del webhook de Stripe        | Implementado (solo `payment_intent.succeeded`) |
| `POST /api/internal/expire-orders`  | Cloud Scheduler    | Bearer `INTERNAL_JOB_SECRET` (local) o token OIDC de Google (producción) | Implementado |

`/api/webhooks/*` y `/api/internal/*` no tienen regla en `proxy.ts`: su única barrera es la propia del handler.

`expire-orders` responde 401 sin credencial o inválida, 503 si no hay ningún modo configurado (falla cerrada), 500 si falla el vencimiento y 200 `{ expired, cancelledIntents }`. Modo secreto: comparación en tiempo constante. Modo OIDC (requiere `EXPIRE_ORDERS_AUDIENCE` y `EXPIRE_ORDERS_SERVICE_ACCOUNT` completos): ID token de Google verificado con `jose` contra el JWKS de Google (emisor `https://accounts.google.com`, `aud`, `exp`, `email` igual a la cuenta de servicio y `email_verified`).

### Local

Stripe CLI reenvía los webhooks a localhost: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` imprime el `whsec_…` que va en `STRIPE_WEBHOOK_SECRET`. Cloud Scheduler no existe en local: el vencimiento se invoca a mano con `curl -X POST -H "Authorization: Bearer $INTERNAL_JOB_SECRET" localhost:3000/api/internal/expire-orders`.

### Supuestos

- **A4** Reserva de 15 minutos.
- **A5** Pago tardío sobre orden vencida: se honra si hay cupo y el evento sigue vendible (`published` y futuro); si no, se reembolsa automáticamente.
- **A6** Emails fuera de alcance.

---

## Casos borde

| Caso                                              | Comportamiento                                                                                              |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Último cupo disputado                             | La transacción bloquea con `FOR UPDATE` las filas de `ticket_types`; el segundo comprador recibe "sin disponibilidad". |
| Webhook duplicado o reordenado                    | Si el `event.id` ya está en `stripe_events`, se ignora.                                                     |
| Pago tardío sobre orden `expired`                 | Se honra si hay cupo y el evento sigue vendible; si no, reembolso automático (A5).                          |
| Falla el espejo del rol en Clerk                  | La acción falla y se reintenta; la BD no queda adelantada sin aviso.                                        |
| Cambio de precio de un tipo de entrada            | No altera órdenes previas: `unit_price_cents` está congelado en `order_items`.                              |
| Bajar `capacity` por debajo de lo vendido         | Se valida en la aplicación (`checkFrozenEdit`, bajo lock), no en la BD (el `CHECK` solo exige `capacity >= 0`). |
| Editar un evento con ventas                       | Precio y nombre del tipo fijos; fecha o lugar solo con confirmación explícita y auditoría.                  |
| Cancelar un evento con ventas                     | Las órdenes `paid` y sus entradas quedan intactas; sin reembolso ni aviso automático (hueco documentado).  |
| Usuario borrado en Clerk                          | La fila queda `suspended` y sus órdenes se conservan.                                                       |
| Google no entrega nombre                          | `full_name` cae a la parte local del email; el usuario lo completa en el checkout.                          |
| Mismo email por Google y por password             | Un solo usuario en Clerk y una sola fila en `users` (`email` es único).                                     |
| Usuario revoca el acceso de Ticktera en Google    | Su cuenta y sesión de Clerk siguen válidas; puede volver a entrar por Google (revocar solo borra el permiso, no la cuenta). |
| Local sin Google Maps                             | `lat`/`lng` quedan nulos y la dirección se guarda como texto.                                               |

---

## Riesgos abiertos

- **Empresa en EE.UU. para la cuenta live de Stripe.** Resuelto el riesgo técnico (ver §3, "Cuenta de Stripe"); queda pendiente crear la entidad y activar la cuenta live antes del despliegue.
- **Proveedor de emails pendiente** (A6): se define al implementar las confirmaciones.
- **Nombre de marca:** el artifact dice "Ticketera" y el repo "Ticktera". Definir el nombre oficial antes de publicar copy.
- **Pantalla de consentimiento de Google (producción):** necesita nombre de marca, dominio y política de privacidad definidos antes de pasar a *In production*. Depende del dominio final y del nombre oficial.
- **Token OIDC de Cloud Scheduler:** la verificación del token está implementada (ver §3, "Endpoints internos"), pero la audiencia y la cuenta de servicio de Cloud Scheduler se definen al desplegar y se cargan en `EXPIRE_ORDERS_AUDIENCE` y `EXPIRE_ORDERS_SERVICE_ACCOUNT`. Hasta entonces, en producción el endpoint responde 503.
- **Monto distinto del esperado:** si `amount_received` no coincide con el de la orden, el webhook no emite entradas ni reembolsa; el cobro queda para revisión manual (el evento no se registra, así que se puede reenviar desde Stripe).
- **Evento cancelado o suspendido con órdenes `paid`:** "Mis entradas" sigue mostrando sus entradas como "Válida" y con QR (el estado sale solo del ticket y de la fecha). El aviso queda para #23 / el CRUD de eventos.
- **Orden `paid` sin tickets** (solo un bug del webhook; se emiten en la misma transacción): no se lista en "Mis entradas" para no romper la pantalla. Detectarla es revisión manual.
- **Código del QR sin firma:** si #24 no limita intentos, un atacante podría probar códigos (~59 bits). El contrato de #24 exige el límite y la búsqueda exacta.
- **Reembolso manual simultáneo al webhook:** queda una ventana mínima entre la lectura del cargo y el commit en la que un reembolso hecho a mano no se ve. Se cierra con `charge.refunded` (#23).
- **El job marca `failed` los `payments` pendientes de órdenes vencidas aunque Stripe ya hubiera cobrado.** Si ese pago llega después, el webhook lo trata como tardío por el estado de la orden (no del pago): se honra con cupo o se reembolsa. Con un monto distinto del de la orden, si la orden vence después, el cobro sigue en Stripe sin reembolso automático: la conciliación manual se hace por `payments.stripe_payment_intent_id` o por el `metadata.order_id` del PaymentIntent.
