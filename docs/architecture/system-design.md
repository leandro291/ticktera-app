# System design

Arquitectura de Ticktera: componentes, ambientes, autenticación y roles, pagos y flujo de compra. El design system visual está en [`../design-system.md`](../design-system.md) y el modelo de datos en [`./mer.md`](./mer.md). Origen: `specs/platform/system-design-and-mer.md`.

---

## 1. Componentes y ambientes

### Diagrama de componentes

```
Browser ─► Next.js 16 (App Router, Server Actions + route handlers)
             ├─► Clerk            identidad (email/password + Google)
             ├─► Postgres         vía Drizzle ORM (Neon local / Cloud SQL prod)
             ├─► Stripe           cobro con tarjeta + webhooks
             └─► Google Maps      solo prod: mapa y autocompletar de dirección
```

### Local vs producción

| Pieza    | Local                                                   | Producción                                                    |
| -------- | ------------------------------------------------------- | ------------------------------------------------------------- |
| App      | `next dev` en `localhost:3000`                          | Cloud Run, contenedor Next.js `standalone`                    |
| BD       | Neon, branch de desarrollo                              | Cloud SQL Postgres, conector nativo por socket                |
| Clerk    | Instancia `development`                                 | Instancia `production`                                        |
| Stripe   | Modo test + Stripe CLI reenviando webhooks a localhost  | Modo live, endpoint público en Cloud Run                      |
| Maps     | Apagado: la dirección es texto plano                    | Activo, API key restringida por dominio                       |
| Secretos | `.env.local`                                            | Secret Manager montado como env vars en Cloud Run             |

### Reglas

- **Mismo Postgres en ambos lados.** Neon y Cloud SQL son Postgres: mismo schema y migraciones, solo cambia `DATABASE_URL`. Misma versión mayor de Postgres en los dos.
- **Un solo driver.** `pg` con `drizzle-orm/node-postgres` para Neon y Cloud SQL.
- **Variables validadas con Zod en un único `lib/env.ts`.** Si falta una, la app no arranca. En el alcance actual solo valida `DATABASE_URL`; cada integración agrega las suyas cuando se implemente.
- **Maps se enciende por presencia de su key.** Sin key, el formulario de evento degrada a texto y `lat`/`lng` quedan nulos.
- **Migraciones con `drizzle-kit`.** En producción se corren como paso del pipeline (Cloud Build), nunca desde la app.
- **CI/CD y Terraform:** solo descritos acá, fuera de alcance de esta spec.

### Variables de entorno por ambiente

| Variable                              | Tipo    | Local                          | Producción                    | Notas                                          |
| ------------------------------------- | ------- | ------------------------------ | ----------------------------- | ---------------------------------------------- |
| `DATABASE_URL`                        | secreta | Neon (branch dev)              | Cloud SQL (socket)            | Única validada hoy en `lib/env.ts`             |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`   | pública | Clerk development              | Clerk production              |                                                |
| `CLERK_SECRET_KEY`                    | secreta | Clerk development              | Clerk production              |                                                |
| `CLERK_WEBHOOK_SIGNING_SECRET`        | secreta | Endpoint local (túnel)         | Endpoint de Cloud Run         | Verifica `POST /api/webhooks/clerk`            |
| `STRIPE_SECRET_KEY`                   | secreta | `sk_test_…`                    | `sk_live_…`                   |                                                |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`  | pública | `pk_test_…`                    | `pk_live_…`                   |                                                |
| `STRIPE_WEBHOOK_SECRET`               | secreta | Lo entrega Stripe CLI          | Endpoint live de Stripe       | Verifica `POST /api/webhooks/stripe`           |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`     | pública | Ausente (Maps apagado)         | Restringida por dominio       | Opcional: su presencia enciende Maps           |
| `SUPER_ADMIN_EMAIL`                   | secreta | Email del primer super admin   | Email del primer super admin  | Solo lo lee el script de seed                  |

Las `NEXT_PUBLIC_*` viajan al navegador: nunca van claves secretas con ese prefijo.

---

## 2. Autenticación y roles

Clerk maneja login, registro, Google y sesión. **La app nunca guarda contraseñas.**

### Clerk → `users`

Webhook de Clerk (`user.created`, `user.updated`, `user.deleted`) en `POST /api/webhooks/clerk`, verificado con `verifyWebhook`:

| Evento         | Efecto en `users`                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| `user.created` | Crea la fila: `clerk_user_id` (único), email, nombre; `role = customer` por defecto. Teléfono y documento quedan nulos hasta el checkout. |
| `user.updated` | Actualiza los datos de perfil.                                                                                 |
| `user.deleted` | **No borra la fila**: queda `suspended` y se conservan sus órdenes.                                            |

La compra exige cuenta, así que el documento y el celular del checkout se guardan en el perfil.

### Rol: fuente de verdad y espejo

`users.role` en Postgres es la verdad (`super_admin | admin | organizer | customer`). Cada cambio de rol es una Server Action que:

1. actualiza `users.role` en la BD;
2. luego copia el valor a Clerk `publicMetadata.role`.

En ese orden. Si falla la copia a Clerk, la acción falla y se reintenta.

### Autorización en dos capas

1. **Proxy de Next:** bloquea por grupo de rutas leyendo el rol de los claims de sesión, sin tocar la BD.
2. **Server Action / route handler:** revalida rol y propiedad contra la BD (ej. `event.organizer_id === user.id`).

Los claims solos nunca alcanzan para acciones sensibles.

> Nota: en Next 16 el `middleware` puede llamarse `proxy`. Verificar en `node_modules/next/dist/docs/` antes de implementar.

### Matriz de acceso

| Zona                                          | Quién entra                                                      |
| --------------------------------------------- | ---------------------------------------------------------------- |
| Público (landing, búsqueda, detalle de evento) | Todos, sin sesión                                                |
| Checkout y "Mis entradas"                     | Todo usuario logueado                                            |
| Panel de organizador                          | `organizer` y, para soporte, `admin` y `super_admin`             |
| Panel de administración                       | `admin`, `super_admin`                                           |
| Gestión de administradores y ajustes globales | Solo `super_admin`                                               |

### Supuestos

- **A1** Cliente → organizador por autoservicio con el botón "Vender entradas" (alternativa: aprobación de admin).
- **A2** El primer `super_admin` se crea con un script de seed y la env var `SUPER_ADMIN_EMAIL`. Después el Super admin promueve/degrada administradores.
- **A3** `admin` suspende eventos y usuarios pero no cambia roles.

---

## 3. Pagos y flujo de compra

Stripe `PaymentIntent` con **Payment Element embebido**, solo `card`, moneda `PEN` (el artifact tiene el formulario de tarjeta dentro de la página). Yape y PagoEfectivo del artifact quedan fuera de alcance. **Solo cobra la plataforma:** sin Connect, comisiones ni payouts.

### Flujo

1. **Crear orden** (Server Action, en una transacción):
   - `SELECT … FOR UPDATE` sobre las filas de `ticket_types` involucradas.
   - Disponibilidad = `capacity − vendidas − pendientes vigentes` (pendiente vigente: `status = pending` y `expires_at > now()`).
   - Insertar la orden `pending` con `expires_at = now() + 15 min` y los `order_items` con precio congelado.
   - Crear el PaymentIntent con `metadata.order_id` y clave de idempotencia = id de la orden.
   - Registrar la fila en `payments`.
2. **Confirmar:** el cliente confirma con Payment Element. El navegador nunca decide si el pago fue exitoso.
3. **Webhook `payment_intent.succeeded`** (firma verificada): orden → `paid`, crear las entradas (una fila por unidad, código único para el QR) y actualizar el pago. Idempotente vía `stripe_events` (PK = `event.id` de Stripe). Si la orden ya está `expired`, se aplica A5 (ver Casos borde).
4. **Vencimiento:** Cloud Scheduler llama cada minuto a `POST /api/internal/expire-orders`, autenticado con token OIDC. Marca `expired` las órdenes vencidas y cancela su PaymentIntent. El cálculo de disponibilidad ignora las vencidas aunque el job no haya corrido.
5. **Reembolso:** solo `admin` / `super_admin`, vía API de Stripe. El webhook `charge.refunded` marca la orden `refunded` y anula las entradas.

### Endpoints internos (documentados, no implementados)

| Endpoint                            | Quién llama        | Autenticación                      |
| ----------------------------------- | ------------------ | ---------------------------------- |
| `POST /api/webhooks/clerk`          | Clerk              | Firma (`verifyWebhook`)            |
| `POST /api/webhooks/stripe`         | Stripe             | Firma del webhook de Stripe        |
| `POST /api/internal/expire-orders`  | Cloud Scheduler    | Token OIDC                         |

### Local

Stripe CLI reenvía los webhooks a localhost. Cloud Scheduler no existe en local: el endpoint de vencimiento se invoca a mano o con un script de desarrollo.

### Supuestos

- **A4** Reserva de 15 minutos.
- **A5** Pago tardío sobre orden vencida: se honra si hay cupo; si no, se reembolsa automáticamente.
- **A6** Emails fuera de alcance.

---

## Casos borde

| Caso                                              | Comportamiento                                                                                              |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Último cupo disputado                             | La transacción bloquea con `FOR UPDATE` las filas de `ticket_types`; el segundo comprador recibe "sin disponibilidad". |
| Webhook duplicado o reordenado                    | Si el `event.id` ya está en `stripe_events`, se ignora.                                                     |
| Pago tardío sobre orden `expired`                 | Se honra si hay cupo; si no, reembolso automático (A5).                                                     |
| Falla el espejo del rol en Clerk                  | La acción falla y se reintenta; la BD no queda adelantada sin aviso.                                        |
| Cambio de precio de un tipo de entrada            | No altera órdenes previas: `unit_price_cents` está congelado en `order_items`.                              |
| Bajar `capacity` por debajo de lo vendido         | Se valida en la aplicación, no en la BD (el `CHECK` de la BD solo exige `capacity >= 0`).                   |
| Usuario borrado en Clerk                          | La fila queda `suspended` y sus órdenes se conservan.                                                       |
| Local sin Google Maps                             | `lat`/`lng` quedan nulos y la dirección se guarda como texto.                                               |

---

## Riesgos abiertos

- **Stripe y `PEN` desde Perú (NO confirmado).** Verificar antes de producción si Stripe permite abrir la cuenta de la plataforma y cobrar en `PEN` desde Perú. Puede obligar a usar otra jurisdicción para la cuenta. Hasta confirmarlo, este documento no da por hecho que sea posible ni imposible.
- **Proveedor de emails pendiente** (A6): se define en la spec de confirmaciones.
- **Nombre de marca:** el artifact dice "Ticketera" y el repo "Ticktera". Definir el nombre oficial antes de publicar copy.
- **Token OIDC de Cloud Scheduler:** audiencia y configuración se deciden en la spec de despliegue.
