# CRUD de eventos del organizador (con moderación de admin)

- Module: organizer
- Status: approved
- Approved by: lenadro291 (2026-10-09)
- Mode: SDD

## Goal
El organizador crea, edita, publica, despublica, cancela y elimina **sus** eventos desde `/organizer`, persistidos en Postgres (se acaba el guardado en localStorage), con la portada en Vercel Blob. `admin` y `super_admin` **moderan** (suspender, reactivar, cancelar) eventos de cualquier organizador desde una vista mínima `/admin/events`, sin editar su contenido. Todo con autorización en servidor, reglas de negocio puras y protección de los compradores cuando ya hay ventas.

## Scope
- In:
  - Permisos: `events:manage-own` se extiende a `admin`/`super_admin`; `events:suspend` se reemplaza por `events:moderate`.
  - Reglas puras con tests: máquina de estados por rol, reglas de publicación, congelamiento con ventas, slug, hora de Lima, validación de portada, límites.
  - Server Actions: `saveEventAction` (crear/actualizar, borrador o publicar), `transitionEventAction` (publicar, despublicar, cancelar), `moderateEventAction` (suspender, reactivar, cancelar), `deleteEventAction`.
  - Portada: `POST|DELETE /api/events/[id]/cover` (subida servidor → Vercel Blob; en BD solo la URL).
  - Edición: `/organizer/events/[id]/edit` (datos cargados en el servidor) y `EventForm` conectado a la BD (crear/editar/borrador/publicar).
  - Dashboard: acciones por fila (Editar, Publicar, Despublicar, Cancelar, Eliminar) con `AlertDialog`.
  - Moderación: `/admin/events` (lista `scope=all` + Suspender/Reactivar/Cancelar) y su ítem en el menú.
  - Docs: `system-design.md` (Blob, permisos, CRUD de eventos, punto de integración del checkout) y `mer.md`.
- Out:
  - **Reembolsos** al cancelar un evento con ventas (hueco documentado, spec aparte: `system-design` §3 paso 5 solo cubre reembolso manual de admin).
  - Avisar a compradores de cancelaciones o cambios (emails fuera de alcance, A6).
  - Cablear checkout y catálogo público (siguen en mock): la regla "solo se vende si `published` y futuro" queda **anotada**, sin cablear.
  - Editar contenido ajeno por parte de admin; borrar eventos ajenos; panel `/admin` completo (solo `/admin/events`).
  - Búsqueda, filtros, paginación y nombre del organizador en la vista de moderación (`// ponytail:` ver D17).
  - Google Maps / `lat`, `lng` (siguen nulos), moneda distinta de PEN, editar categorías, check-in.
  - Suspender los eventos de un organizador al suspender a la persona (hoy sus eventos siguen a la venta hasta que un moderador los suspenda; documentado).
  - Rate limit por ventana de tiempo (solo tope por conteo, ver D14).
  - Migrar borradores de localStorage (D12).

## Decisiones (ya tomadas por el usuario: U1–U4; el resto son propuestas, el usuario valida)
| #   | Decisión |
| --- | -------- |
| U1  | **Admin/super_admin = moderación.** Ven todo (`scope=all`) y pueden suspender, reactivar y cancelar eventos de cualquiera; **no** editan contenido, precios ni tipos de entrada ajenos. El organizer hace CRUD completo solo de SUS eventos (propiedad verificada en servidor contra `events.organizer_id`). Un admin que es dueño de un evento lo edita por la ruta de dueño. |
| U2  | **Con ventas se congela lo que afecta al comprador** (paid o pending vigente): sin cambio de precio, sin bajar capacidad bajo lo comprometido, sin borrar tipos con ventas. Sí: descripción, portada, agregar tipos. Cancelar no borra órdenes ni ingresos. |
| U3  | **Eliminar**: sin ninguna orden → `DELETE` real (cascade a `ticket_types`); con órdenes → solo cancelar. Chequeo atómico: transacción + FK `order_items.ticket_type_id` sin cascade → `23503` (patrón `deleteUser`). |
| U4  | **Portada** en Vercel Blob, subida desde el servidor, validada (MIME, magic bytes, tamaño), nombre aleatorio; en BD solo la URL en `events.cover_image_url`. |
| D1  | **Permisos.** `events:manage-own` ya existe (solo organizer): se **reutiliza** y se extiende a `admin` y `super_admin` (U1: "admin dueño edita los suyos"). **No** se parte en `create`/`update-own`/`delete-own`: serían 3 permisos con exactamente los mismos roles; lo que diferencia las operaciones es el *estado* del evento y la *propiedad*, no el rol (van en la máquina de estados, D2). `events:suspend` (definido en la spec de roles, sin uso en código) se **reemplaza** por `events:moderate` (admin, super_admin) porque ahora cubre suspender, reactivar y cancelar; A3 se actualiza. Matriz y test de `ROLE_PERMISSIONS` se editan. Se descarta `events:cancel` aparte: cancelar lo hace el dueño (`manage-own`) o un moderador (`moderate`), no hay un tercer rol. |
| D2  | **Máquina de estados** (función pura `allowedActions(status, { owner, moderator })`): `draft → published` (dueño), `published → draft` (dueño, solo sin ventas), `draft`/`published → cancelled` (dueño; `draft` se elimina en vez de cancelar, así que en la práctica `published → cancelled`), `published ↔ suspended` y `published`/`suspended → cancelled` (solo moderador). `cancelled` es terminal. `suspended` bloquea al dueño por completo (editar, cancelar, eliminar): un organizador no puede escapar de una moderación. El moderador no toca `draft` ni elimina. Eliminar: dueño en `draft`, `published` o `cancelled` (si no hay órdenes, lo decide la FK). |
| D3  | **Editar** solo en `draft` y `published` (dueño). En `published` rigen las reglas de congelamiento (D5) y se vuelven a exigir las reglas de publicación (≥ 1 tipo, capacidad total ≥ 1). |
| D4  | **Publicar** exige: título, categoría, lugar y ciudad no vacíos, `starts_at` **futuro**, ≥ 1 tipo de entrada y capacidad total ≥ 1. "Futuro" = **posterior a ahora** (instante), con fecha y hora interpretadas en **hora de Lima** (UTC-5, sin DST) en el servidor, igual que `db/seed/mock-to-rows.ts`. Se **reutiliza el criterio de Lima** pero no el de `ensureFuture` ("estrictamente después del día de hoy"): ese existe para que un seed fresco no publique eventos de hoy; un organizador sí puede publicar un evento de esta noche. En eventos ya `published` la fecha solo se revalida si cambió (editar la descripción de un evento que ya pasó no falla). |
| D5  | **Congelamiento** (función pura `checkFrozenEdit`). "Comprometido" por tipo = `paid + reservado` (reservado = `order_items` de órdenes `pending` con `expires_at > now()`). Con comprometido > 0: **precio fijo**, **nombre fijo** (`order_items` no guarda snapshot del nombre: renombrar "General" a "VIP" cambiaría lo que ve quien ya compró; fácil de relajar), `capacity >= comprometido`, no se puede quitar. Un tipo sin comprometido pero con **cualquier** `order_items` (órdenes vencidas/reembolsadas) tampoco se puede quitar (la FK lo impediría): se "retira" con capacidad 0. `max_per_order` es libre (solo afecta compras futuras). Agregar tipos y editar descripción/portada/categoría: libres. |
| D6  | **Fecha/lugar/dirección/ciudad con ventas: permitido con reconocimiento explícito.** Bloquearlo obliga a cancelar, y como no hay reembolsos todavía eso deja al comprador sin evento y sin dinero; permitirlo en silencio cambia lo que pagaron sin que lo sepan. Se exige `acknowledgeBuyerImpact: true` (el formulario muestra un `AlertDialog`: "Ya hay entradas vendidas o reservadas. Cambiar fecha o lugar afecta a los compradores y hoy no les avisamos") y queda registrado en el log de auditoría. `// ponytail:` cuando existan emails (A6), notificar a compradores. La nueva fecha debe ser futura. |
| D7  | **Lectura para editar sin endpoint nuevo.** La página `/organizer/events/[id]/edit` es un Server Component que llama `getEventForEdit(actor.id, id)` directo y pasa los datos al formulario. Se descarta `GET /api/events/[id]`: el único consumidor es esa página (sin fetch de cliente, sin estado de carga, sin otra superficie HTTP que proteger) y ampliar el listado `/api/events` engordaría cada respuesta con descripción/tipos para algo que solo usa la edición. Evento ajeno o inexistente → `notFound()` (404 idéntico: no se filtra la existencia). Cuesta: el detalle no es consultable desde cliente; si algún día hace falta, se agrega el handler sobre el mismo servicio. |
| D8  | **Control optimista con `updated_at`.** El formulario envía `expectedUpdatedAt` (ISO del detalle); `UPDATE … WHERE date_trunc('milliseconds', updated_at) = $expected`. Se trunca porque `updated_at` nace con `now()` en microsegundos y JS solo guarda milisegundos: sin el truncado la igualdad fallaría en filas nunca editadas. Distinto → `stale` ("Otra pestaña modificó este evento. Recarga para ver los cambios."). Las transiciones de estado no lo usan (son compare-and-set sobre `status` bajo lock de fila). La portada es última-escritura-gana. |
| D9  | **Concurrencia con checkout.** `saveEvent`, `transitionEvent` y `deleteEvent` abren transacción, bloquean la fila del evento (`SELECT … FOR UPDATE`) y las filas de `ticket_types` del evento (`FOR UPDATE`, el mismo lock que usa "crear orden" en system-design §3) **antes** de leer ventas. Así una orden concurrente espera nuestro commit y no hay ventana entre "no hay ventas" y "cambié el precio". Postgres no permite `FOR UPDATE` con `GROUP BY`: primero se bloquean los ids, luego una consulta agregada calcula `paid`, `reservado` y `order_items` por tipo. Publicar vs eliminar: ambas pasan por el lock de la fila; la perdedora ve `not-found`/`invalid-transition`. |
| D10 | **Una acción por familia de operación**, no un `saveEventAction` con modo para todo: `saveEventAction` (contenido + flag `publish`), `transitionEventAction` (dueño: `publish`/`unpublish`/`cancel`), `moderateEventAction` (moderador: `suspend`/`reactivate`/`cancel`), `deleteEventAction`. Cada una exige un permiso distinto (`manage-own` vs `moderate`), así el permiso nunca depende de un campo del payload. `status`, `organizerId`, `slug`, `publishedAt` y `coverImageUrl` **no existen** en ningún schema de entrada (Zod los descarta). `publish` en `saveEventAction` = guardar y publicar en una transacción; en el dashboard "Publicar" usa `transitionEventAction` sobre lo ya guardado. |
| D11 | **Borrador = campos NOT NULL del modelo.** Para no tocar el schema (cero migraciones) un borrador exige título, categoría, fecha, hora, lugar y ciudad (`starts_at`, `venue_name`, `city`, `category_id` son NOT NULL). Tipos de entrada, descripción y portada son opcionales. El botón "Guardar borrador" deja de ser `formNoValidate`. Alternativa descartada: hacer nullable `starts_at`/`venue_name`/`city` (migración + `null` en todas las consultas públicas y el tipo `EventListItem`). |
| D12 | **Borradores locales (zustand + data URLs) se abandonan, no se migran.** Desde la spec anterior ya no aparecen en el dashboard, no tienen dueño verificable, y migrarlos exigiría un viaje con data URLs de ~200 KB cada una. Se elimina `useOrganizerStore`, se borra la clave `ticketera:organizer` de localStorage una vez (en `PersistedStores`, `// ponytail:` quitar tras un release) y `?draft=<id>` deja de existir (un bookmark viejo abre el formulario en blanco). `?saved=` pasa a ser real: `published` ("Tu evento se publicó."), `draft` ("Guardamos tu borrador."), `updated` ("Guardamos los cambios."); desaparece el copy "en este navegador". |
| D13 | **Portada: subida por route handler servidor, no Server Action ni client upload.** (a) Server Action: tope por defecto de 1 MB (`serverActions.bodySizeLimit`, `node_modules/next/dist/docs/01-app/02-guides/server-actions.md`): habría que tocar `next.config.ts` y el binario viaja por el transporte de actions. (b) Client upload con token (`handleUpload`): el cliente recibe y devuelve la URL (hay que volver a confiar en una URL del cliente), el callback `onUploadCompleted` no llega a localhost y suma un endpoint de tokens. (c) **Route handler** `POST /api/events/[id]/cover` con `multipart/form-data`: sin config extra, códigos HTTP explícitos (413/415/503), la URL nace en el servidor y se escribe en BD ligada al evento autorizado. El formulario ya comprime a JPEG ≤ 1280 px (≈ 150–400 KB), muy por debajo del tope de 4.5 MB de funciones de Vercel; el servidor además rechaza > 2 MiB. Se **sube después de guardar** (el evento necesita id): si la subida falla el evento queda guardado y se informa (AC21). |
| D14 | **Validaciones de portada** (puras): MIME declarado ∈ `image/jpeg`, `image/png`, `image/webp` (sin SVG: vector de XSS; sin GIF), tamaño 1 B–2 MiB, **magic bytes** del archivo coinciden con el MIME (JPEG `FF D8 FF`, PNG `89 50 4E 47 0D 0A 1A 0A`, WebP `RIFF….WEBP`), nombre `events/<eventId>/<uuid>.<ext>` generado en servidor (más `addRandomSuffix`), `access: "public"`. Protección CSRF del handler: se rechaza `Sec-Fetch-Site: cross-site` (la cookie de Clerk ya es SameSite=Lax; no se compara `Origin` porque detrás de proxies de Cloud Run el host interno difiere). |
| D15 | **Imagen vieja.** Al reemplazar o quitar la portada, y al eliminar el evento, `del(urlVieja)` **best-effort después** de confirmar la BD, solo si `isBlobUrl(url)` (portadas del seed `/images/…` jamás se tocan); un fallo se loguea y no bloquea (`// ponytail: puede quedar huérfana; barrido periódico si el costo de storage importa`). Si el `UPDATE` de BD no afecta filas (evento borrado o cambiado mientras subía), se hace `del` de la nueva y se responde 404. Si `put` falla: BD sin cambios, 502. `BLOB_READ_WRITE_TOKEN` es **opcional** en `lib/env.ts` (no rompe `next build`); sin token solo la portada responde 503 `storage-unavailable`, el resto del CRUD funciona. Cancelar un evento conserva su portada. |
| D16 | **Slug.** `slugBase(title)` = `slugify` (se mueve a `modules/event/lib/event-slug.ts`; el seed lo importa) recortado a 60 y `evento` si queda vacío; `uniqueSlug(base, taken, random)` agrega `-<5 caracteres>` si el base está tomado. El servicio consulta los slugs que empiezan por el base y deja el índice único como última barrera: una carrera rarísima da `slug-conflict` ("Reintenta"). Se genera al crear y se **regenera mientras el evento sea borrador y `published_at` sea nulo** (el título cambia); desde la primera publicación es **inmutable** aun si se despublica (URLs estables). |
| D17 | **Moderación en `/admin/events`** (la ruta `/admin` ya está reservada por el proxy para admin/super_admin y sin UI). Se agrega solo esa página y su ítem "Eventos" en la sección Administración del menú, con permiso `events:moderate`. Usa `useEvents("all")`; sin buscador, filtros ni nombre del organizador (el contrato de lista no expone datos de usuario): `// ponytail: sin búsqueda; techo ~500 eventos en cliente; agregar filtro por estado y organizerName (solo scope all) cuando haga falta`. El admin dueño de eventos los gestiona en `/organizer` (scope `mine`). |
| D18 | **Seguridad** (resumen; los ACs lo hacen verificable): capa 2 en cada mutación (`requirePermission` ⇒ rol + usuario `active`); propiedad **dentro del SQL** (`WHERE id = $1 AND organizer_id = $actor`) y ids de tipos de entrada revalidados contra el evento dentro de la transacción (IDOR); Zod estricto (descarta extras); textos **sin HTML** (patrón `<tag>` rechazado), sin caracteres de control ni de dirección bidi, `NUL` imposible; el contenido se renderiza con React (escape por defecto) y no existe `dangerouslySetInnerHTML` en el repo; errores al cliente genéricos (`not-found` es el mismo para ajeno e inexistente; detalles solo a `console.error`); nunca se devuelve `organizerId`. **Tope anti-abuso** = `maxEventsPerOrganizer` (200) contado al crear, sin lock (`// ponytail: sin rate limit por ventana ni límite de subidas de portada; Clerk ya limita el auth; agregar Upstash/WAF si hay abuso`). **Auditoría mínima**: `console.info(JSON.stringify({ evt: "event.audit", action, eventId, actorId, from, to, ack }))` en cada mutación exitosa, sin tabla nueva (mer A9: sin `audit_logs`). |
| D19 | **Cancelado/suspendido dejan de venderse.** El alcance público `published` ya filtra por `status = 'published'`, así que desaparecen de los listados. Punto de integración para el checkout futuro (se anota en system-design §3, no se cablea): "crear orden" debe, **después** de bloquear los `ticket_types`, unir `events` y exigir `status = 'published'` y `starts_at > now()`. Las órdenes `paid` previas de un evento cancelado quedan intactas (ingresos y entradas siguen contando en el dashboard hasta reembolsar). |
| D20 | **Categorías desde la BD.** Se lee con `listCategories()` (servicio de servidor, solo lectura) en las páginas `new`/`edit` y se pasa al formulario por props; sin endpoint. `categoryId` se valida (`z.uuid()` + existencia dentro de la transacción → `invalid-category`). `EVENT_CATEGORIES` estático se conserva (catálogo mock y seed). Sin categorías en BD (seed no corrido) el formulario muestra un aviso y no deja guardar. |
| D21 | **Límites** en un único objeto `EVENT_LIMITS` (fácil de ajustar): título 120, descripción 5000, lugar 120, dirección 200, ciudad 80, nombre de tipo 60, máx. 10 tipos, precio ≤ 1 000 000 céntimos (S/ 10 000), capacidad ≤ 100 000, `max_per_order` 1–20 (default 6, el mismo valor que usa el seed), 200 eventos por organizador, portada 2 MiB. Moneda: solo PEN (no hay campo de moneda). |

## Reuse
Reference: system-design §2 (Autorización en dos capas, Permisos, Matriz de acceso, A3), §3 (flujo de compra: lock `FOR UPDATE`, disponibilidad, reembolso), "Casos borde" (cambio de precio, bajar capacidad); mer.md `events`, `ticket_types`, `orders`, `order_items` y "Reglas de negocio derivadas del modelo"; `specs/organizer/real-data-dashboard.md` (`useEvents`, `GET /api/events`); `specs/users/users-crud-design.md` (patrón action `run`, transacción + `23503`, `AlertDialog`); `specs/platform/clerk-db-roles-and-seed.md` (formato de "Pasos manuales").
- Reuse: `modules/auth/server` (`requirePermission`, `requirePagePermission`, `AuthorizationError`), `modules/auth` (`can`, `parseRole`), `db`, `db/schema/{events,orders}` — **cero migraciones**: todas las columnas, FKs, índices y CHECKs necesarios ya existen (`cover_image_url`, `published_at`, `updated_at`, único `(event_id, name)`).
- Reuse: `useEvents` y su query key `["events", scope, owner]`: tras cada mutación `queryClient.invalidateQueries({ queryKey: ["events"] })` (prefijo) refresca todos los alcances; `ManagedEventItem`, `SoldBar`, `EventSalesSheet`, `StatusBadge` (mapa `STATUS_BADGE` del dashboard), `formatPriceCents`, `isoToLimaDate`, `Skeleton`, `PageLoading`.
- Reuse: patrón de `modules/users/actions/user-admin-actions.ts` (`run`: permiso → Zod → servicio → resultado serializable); transacción + `23503` de `deleteUser`; `components/ui/{alert-dialog,dialog,table,skeleton,select,input,textarea,button}` ya instalados; `components/shared/panel-shell`, `panel-nav`.
- Reuse: criterio de Lima (`America/Lima`, `-05:00`, sin DST) de `db/seed/mock-to-rows.ts`; `EventForm*` (diseño, clases `field/label/section`, `EventFormPreview`) sin rediseñar.
- Reuse: `zod`, `@tanstack/react-query` (`useMutation`), `vitest`. **Única dependencia nueva: `@vercel/blob`** (`put`, `del`; no hay stdlib ni dependencia instalada que hable con Blob). Verificado en npm: `@vercel/blob@2.8.0`, `access` es obligatorio (`'public' | 'private'`), `put` acepta `addRandomSuffix` y `contentType`.
- Extend: `modules/auth/lib/permissions.ts` (+test) — D1.
- Extend (mover): `modules/users/lib/db-errors.ts` (+test) → `lib/db-errors.ts` (+test), transversal, con `isForeignKeyViolation`, `isUniqueViolation` y `pgConstraint`; `modules/users/services/user-admin-service.ts` cambia su import. Razón: `modules/event` no puede importar internos de `users` (SETUP §1.6) y el helper no es de ningún dominio.
- Extend: `lib/env.ts`, `.env.example` — `BLOB_READ_WRITE_TOKEN` opcional.
- Extend: `modules/event/lib/format.ts` (+test) — `isoToLimaTime`. `db/seed/mock-to-rows.ts` — importa `slugify` desde `modules/event/lib/event-slug.ts` y lo re-exporta (su test sigue válido).
- Extend: `modules/event/index.ts`, `modules/event/server.ts` — exports de acciones, hook de mutaciones, reglas puras (`allowedActions`) y servicios.
- Extend: `modules/organizer/components/{event-form,event-form-cover,event-form-tiers,event-form-preview,organizer-dashboard}.tsx`, `lib/event-draft.ts` (+test), `app/organizer/page.tsx`, `app/organizer/events/new/page.tsx`, `components/shared/panel-nav.ts` (+test), `components/shared/persisted-stores.tsx`, `modules/organizer/index.ts`.
- Replace: `modules/organizer/lib/image-data-url.ts` → `image-compress.ts` (devuelve `Blob` JPEG ≤ 1280 px con `canvas.toBlob`, ya no data URL).
- Delete: `modules/organizer/store/use-organizer-store.ts` y `types/organizer-event.ts` (tipos del store local), vía Fase 9; la clave de localStorage se limpia una vez (D12).
- New (dominio `modules/event`): `lib/{event-limits,event-transitions,event-publish,event-freeze,event-slug,lima-datetime,cover-image,field-errors}.ts`, `types/event-write.ts`, `schemas/event-save-schema.ts`, `services/{event-error,event-audit,event-sales,event-save-service,event-status-service,event-read-service,event-cover-service}.ts`, `actions/event-actions.ts`, `hooks/use-event-mutations.ts`, `lib/event-action-copy.ts`, `components/{event-action-dialog,moderation-events-page}.tsx`. Nada equivalente existe: `event-list-service` solo lee (con ventas agregadas) y `event-service` es el catálogo mock.
- New (UI organizer): `components/{event-row-actions,event-form-impact-dialog}.tsx`, `types/event-form.ts`, `lib/image-compress.ts`. New routing: `app/organizer/events/[id]/edit/page.tsx`, `app/api/events/[id]/cover/route.ts`, `app/admin/{layout.tsx,events/page.tsx}`. New shadcn: `dropdown-menu` (cinco acciones por fila no caben en la columna; `npx shadcn@latest search @shadcn -q dropdown-menu` + `docs dropdown-menu` antes de usarlo; el preset es `base-nova`/`@base-ui/react`).
- No se instala: librería de slug, de sanitización HTML (se rechaza el HTML, no se limpia), de rate limit, ni `axios` (no hay `lib/api`).
- Dónde vive qué (SETUP §1): servicios, reglas, schemas, acciones y hook de mutaciones = dominio evento → `modules/event`. Formulario, dashboard y sus acciones por fila = `modules/organizer` (consume `modules/event` solo por su `index.ts`). La página de moderación es dominio evento (reusa `useEvents`, no depende de organizer). `app/` solo rutas delgadas. `@vercel/blob`, `pg` y Clerk viven únicamente en `server.ts`/servicios/acciones/route handlers.

## Acceptance criteria
Permisos y autorización
- AC1: `events:manage-own` lo tienen `organizer`, `admin` y `super_admin` (no `customer`); `events:suspend` desaparece y `events:moderate` lo tienen `admin` y `super_admin`. La matriz completa rol × permiso sigue cubierta por test.
- AC2: Las cuatro acciones y el route handler llaman `requirePermission` **antes** de Zod y de tocar BD: `manage-own` para `save`/`transition`/`delete`/cover, `moderate` para `moderate`. `unauthenticated`/`suspended`/`forbidden` devuelven un mensaje fijo, sin detalle. Un usuario `suspended` no pasa aunque su sesión siga vigente.
- AC3: Ningún schema de entrada acepta `organizerId`, `status`, `slug`, `publishedAt` ni `coverImageUrl`; si llegan en el payload se descartan y nunca se leen (test del schema).
- AC4: **Propiedad en el servidor.** Toda operación de dueño (`save` con `id`, `transition`, `delete`, cover) incluye `organizer_id = actor.id` en la misma consulta que bloquea el evento. Un id ajeno o inexistente produce el mismo `not-found` (y 404 en la página de edición y en el handler). Moderar no exige propiedad pero sí `events:moderate`; la moderación **solo** cambia `status` (nunca contenido, precios ni tipos).
- AC5: Los ids de tipos de entrada del payload se revalidan dentro de la transacción contra los tipos reales del evento: un id que no pertenece al evento (de otro evento, inventado o repetido) rechaza toda la operación sin escribir nada (`checkFrozenEdit` → `tier-not-found` / `duplicate-tier-id`).

Máquina de estados y publicación
- AC6: `allowedActions(status, { owner, moderator })` implementa D2 y está testeada para los 4 estados × {dueño, moderador, ambos, ninguno}: `suspended` no ofrece nada al dueño; `cancelled` solo `delete` al dueño; el moderador nunca recibe `edit`, `delete` ni acciones sobre `draft`.
- AC7: `checkPublishable` implementa D4 (título, categoría, lugar, ciudad, fecha futura, ≥ 1 tipo, capacidad total ≥ 1) y devuelve todos los problemas, cada uno con su campo. Publicar con problemas → `not-publishable` con `fieldErrors` y nada cambia.
- AC8: Publicar fija `status = 'published'` y `published_at = now()`; despublicar (`published → draft`) limpia `published_at` y exige **cero** ventas comprometidas (paid o pending vigente) → si no, `has-sales` ("cancélalo en lugar de despublicarlo"). Cancelar y moderar son compare-and-set sobre `status` bajo lock de fila: la transición inválida (ya cambió) → `invalid-transition`.
- AC9: Un evento `suspended` o `cancelled` no aparece en `GET /api/events?scope=published` (ya filtra por `published`) y la regla del checkout queda escrita en system-design §3 (D19).

Guardar (crear / editar)
- AC10: `saveEventSchema` valida con los límites de D21: textos recortados y con espacios colapsados (la descripción conserva saltos de línea), sin HTML (`<tag>`), sin caracteres de control ni bidi; `date` `yyyy-mm-dd` y `startTime` `HH:mm` reales; hasta 10 tipos con nombres únicos sin distinguir mayúsculas, precio entero en céntimos ≤ máximo, capacidad entera 0–máximo, `maxPerOrder` 1–20 (default 6); `expectedUpdatedAt` obligatorio cuando hay `id`. Un borrador exige título, categoría, fecha, hora, lugar y ciudad (D11).
- AC11: El servidor convierte `date` + `startTime` a `starts_at` con `limaDateTimeToDate` (`-05:00`); una fecha imposible ("2026-02-30") o con formato inválido se rechaza. La zona horaria del navegador no interviene.
- AC12: Crear inserta evento `draft` y tipos (`sort_order` = posición) en **una transacción**; con `publish: true` además publica en la misma transacción (todo o nada). Verifica categoría existente (`invalid-category`) y el tope de 200 eventos (`limit-reached`). `organizer_id` = `actor.id`.
- AC13: Slug según D16: único (`uniqueSlug`), regenerado mientras `draft` y sin `published_at`, inmutable desde la primera publicación. Colisión rarísima de carrera → `slug-conflict`.
- AC14: Actualizar bloquea evento y tipos (D9), exige estado `draft`/`published` (`not-editable` para `cancelled`/`suspended`) y `expectedUpdatedAt` igual al de la fila (`date_trunc('milliseconds', …)`, D8) → si no, `stale` y nada se escribe. Sincroniza tipos: los ausentes se borran, los con `id` se actualizan (`WHERE id = $ AND event_id = $evento`), los sin `id` se insertan.
- AC15: **Congelamiento** (`checkFrozenEdit`, D5): con comprometido > 0 un tipo rechaza cambio de precio, cambio de nombre, capacidad < comprometido y eliminación; un tipo con cualquier `order_items` no se elimina; agregar tipos y cambiar descripción, portada, categoría o `maxPerOrder` siempre se permiten. Los errores salen como `fieldErrors` por tipo (`tiers.<i>.priceCents`, etc.) con el mínimo permitido en el mensaje de capacidad.
- AC16: Con ventas, cambiar fecha, hora, lugar, dirección o ciudad sin `acknowledgeBuyerImpact: true` → `frozen` con `buyer-impact-unacknowledged`; con el flag se permite (fecha futura obligatoria) y la auditoría registra `ack: true`. Sin ventas no se pide.
- AC17: Un tipo de entrada **sin** órdenes se elimina de verdad; la verificación y la escritura ocurren bajo el lock de D9 (el checkout concurrente espera y luego no encuentra el tipo).

Eliminar y cancelar
- AC18: `deleteEvent` ejecuta en una transacción `DELETE FROM events WHERE id = $1 AND organizer_id = $actor AND status <> 'suspended'`; si Postgres lanza `23503` (hay `order_items` en algún tipo) responde `has-orders` ("Tiene órdenes asociadas, por eso no se puede eliminar. Cancélalo en su lugar.") y el evento sigue intacto; sin órdenes, `ticket_types` caen por cascade. Tras el commit, `del` best-effort de la portada si es URL de Blob. Cero consultas "contar y luego borrar".
- AC19: Cancelar (dueño o moderador) solo cambia `status = 'cancelled'`: no toca `orders`, `order_items`, `payments` ni `tickets`; sus ventas `paid` siguen sumando en el dashboard. El copy del diálogo y el aviso dicen explícitamente que **no** hay reembolso ni aviso automático a compradores.

Portada
- AC20: `POST /api/events/[id]/cover` (campo `file` en `multipart/form-data`): `Sec-Fetch-Site: cross-site` → 403; `id` no uuid o ajeno → 404; sin token de Blob → 503 `storage-unavailable`; `Content-Length` > 2 MiB + margen o archivo > 2 MiB → 413; tipo no permitido, vacío o magic bytes que no coinciden con el MIME → 415 `invalid-image`; evento `cancelled`/`suspended` → 409. OK: `put` (`access: "public"`, ruta `events/<id>/<uuid>.<ext>`), `UPDATE events SET cover_image_url` con propiedad en el `WHERE`, `del` best-effort de la anterior (D15) y respuesta `{ coverImageUrl }`. `put` falla → 502 `storage-failed` y la BD queda igual. `DELETE` quita la portada con las mismas reglas de autorización.
- AC21: En el formulario, si el evento se guardó pero la portada falla, el usuario va a `/organizer/events/<id>/edit?cover=failed` y ve "Guardamos el evento, pero no pudimos subir la portada. Súbela de nuevo." (nunca queda un evento duplicado al reintentar: ya hay `id`).
- AC22: El cliente comprime a JPEG ≤ 1280 px (`Blob`) antes de enviar y rechaza archivos > 15 MB de origen o ilegibles con mensaje; ya no se generan ni se guardan data URLs. Se aceptan JPG, PNG y WebP.

UI
- AC23: `/organizer/events/new` y `/organizer/events/[id]/edit` son Server Components delgados: exigen `events:manage-own` (`requirePagePermission`), cargan `listCategories()` y (edición) `getEventForEdit`. Evento ajeno/inexistente → `notFound()`; `cancelled`/`suspended` → `redirect("/organizer")`.
- AC24: `EventForm` crea o edita en la BD. Valida en cliente con el mismo `saveEventSchema` + `checkPublishable` (cuando publica), muestra errores bajo cada campo (`aria-invalid`, `aria-describedby`) y un resumen `role="alert"` con foco, aplica los `fieldErrors` del servidor, deshabilita los botones mientras envía (sin doble envío), y al terminar invalida `["events"]` y redirige a `/organizer?saved=published|draft|updated`. Botones: crear → "Guardar borrador" / "Publicar evento"; editar borrador → igual; editar publicado → "Guardar cambios". Las filas de tipos totalmente vacías se ignoran en borrador.
- AC25: En edición, los tipos con comprometido > 0 muestran precio y nombre deshabilitados, capacidad con `min` = comprometido, sin botón de quitar, y un texto explicando por qué; un banner avisa "Este evento ya tiene ventas" cuando corresponde. Si cambian fecha, hora, lugar, dirección o ciudad con ventas, un `AlertDialog` (`EventFormImpactDialog`) pide confirmar antes de enviar con `acknowledgeBuyerImpact`.
- AC26: El dashboard muestra por fila, según `allowedActions(status, { owner: true, moderator: false })`: **Editar** (link, `draft`/`published`), **Ver ventas** (existente, no `draft`) y un menú con **Publicar** (`draft`), **Despublicar** (`published`), **Cancelar** (`published`, con `AlertDialog`) y **Eliminar** (solo si `sold === 0`, con `AlertDialog`). El copy cambia si hay ventas (cancelar) y explica que eliminar es definitivo. Cada acción muestra aviso `role="status"` en éxito o error visible en el diálogo/aviso (`role="alert"`) y refresca la lista (`invalidateQueries`).
- AC27: `/admin/events` (layout con `admin:panel`, página con `events:moderate`) lista `useEvents("all")` con título, fecha (Lima), ciudad, estado, vendidas/capacidad e ingresos, y acciones **Suspender** (`published`), **Reactivar** (`suspended`) y **Cancelar** (`published`/`suspended`) con `AlertDialog`; nunca ofrece editar ni eliminar. El menú muestra "Eventos" en Administración solo con `events:moderate`; el panel-nav tiene test.
- AC28: Estados de carga (esqueleto), error y vacío en la página de moderación; confirmaciones accesibles (`alertdialog`, foco inicial en Cancelar); controles táctiles de 44 px.

Seguridad transversal y calidad
- AC29: Cada mutación exitosa emite el log de auditoría de D18 (sin PII: solo ids); los errores inesperados van a `console.error` y el cliente recibe "No se pudo completar la operación. Reintenta."; ninguna respuesta incluye `organizerId`, emails ni stack.
- AC30: `@vercel/blob`, `pg` y Clerk server no entran al bundle cliente: `modules/event/index.ts` no re-exporta servicios (solo acciones, que Next convierte en referencias), `server.ts` los exporta, y `npm run build` pasa.
- AC31: Cierre de cada fase: `npm run lint`, `npx tsc --noEmit` y `npm test` en verde y la app funcionando; Fases 5 y 9 además `npm run build`.
- AC32: Tras la Fase 9: sin `useOrganizerStore`, `OrganizerEvent`, `image-data-url` ni `events:suspend` (`grep` vacío fuera de specs/docs), sin "en este navegador" en la UI, y `system-design.md`/`mer.md` actualizados (permisos, A3, CRUD de eventos, Blob, integración de checkout, huecos).

## Contracts

### Permisos (`modules/auth/lib/permissions.ts`)
```ts
export type Permission = /* … */ | "events:manage-own" | "events:moderate" /* reemplaza events:suspend */;
// organizer:   events:manage-own, events:read-own            (sin cambios)
// admin:       + events:manage-own, events:moderate (reemplaza events:suspend)
// super_admin: + events:manage-own, events:moderate (reemplaza events:suspend)
// customer:    sin cambios
```

### Límites (`modules/event/lib/event-limits.ts`)
```ts
export const EVENT_LIMITS = {
  titleMax: 120, descriptionMax: 5000, venueMax: 120, addressMax: 200, cityMax: 80,
  tierNameMax: 60, maxTiers: 10, maxPriceCents: 1_000_000, maxCapacity: 100_000,
  maxPerOrderLimit: 20, defaultMaxPerOrder: 6, // = MAX_TICKETS_PER_ZONE del seed (no se importa de purchase)
  maxEventsPerOrganizer: 200, coverMaxBytes: 2 * 1024 * 1024,
} as const;
```

### Tipos (`modules/event/types/event-write.ts`, client-safe)
```ts
import type { EventDbStatus } from "./event-list";

export interface TierInput { id?: string; name: string; priceCents: number; capacity: number; maxPerOrder: number }
export interface SaveEventInput {
  id?: string; expectedUpdatedAt?: string; // ISO; obligatorio si hay id
  title: string; categoryId: string; description: string;
  date: string; startTime: string;         // hora de Lima
  venueName: string; address: string; city: string; // address "" => null en BD
  tiers: TierInput[];                      // posición = sort_order
  publish: boolean; acknowledgeBuyerImpact: boolean;
}
export type TransitionAction = "publish" | "unpublish" | "cancel";
export type ModerationAction = "suspend" | "reactivate" | "cancel";

export type EventErrorCode =
  | "not-found" | "not-editable" | "invalid-transition" | "not-publishable" | "frozen" | "stale"
  | "has-sales" | "has-orders" | "invalid-category" | "limit-reached" | "slug-conflict"
  | "storage-unavailable" | "storage-failed" | "invalid-image";

export type EventActionResult =
  | { ok: true; notice: string; id?: string; updatedAt?: string }
  | { ok: false; error: string; code?: EventErrorCode; fieldErrors?: Record<string, string> }; // clave = ruta ("title", "tiers.1.priceCents")

export interface EventEditData { // sin organizerId
  id: string; status: EventDbStatus; updatedAt: string; // ISO
  title: string; categoryId: string; description: string; coverImageUrl: string | null;
  date: string; startTime: string; venueName: string; address: string; city: string;
  hasSales: boolean; // algún tipo con comprometido > 0
  tiers: { id: string; name: string; priceCents: number; capacity: number; maxPerOrder: number; sold: number; reserved: number; hasOrders: boolean }[];
}
```

### Estados (`modules/event/lib/event-transitions.ts`, puro)
```ts
export type EventAction = "edit" | "publish" | "unpublish" | "cancel" | "suspend" | "reactivate" | "delete";
export function allowedActions(status: EventDbStatus, who: { owner: boolean; moderator: boolean }): EventAction[];
export function nextStatus(action: Exclude<EventAction, "edit" | "delete">): EventDbStatus; // publish→published, unpublish→draft, cancel→cancelled, suspend→suspended, reactivate→published
```
Tabla (D2): `draft`: owner `edit`,`publish`,`delete`. `published`: owner `edit`,`unpublish`,`cancel`,`delete`; moderator `suspend`,`cancel`. `suspended`: owner nada; moderator `reactivate`,`cancel`. `cancelled`: owner `delete`; moderator nada. `owner && moderator` = unión sin duplicados. `unpublish`/`delete` además dependen de datos (ventas / órdenes): `allowedActions` solo dice si el *estado* lo permite; el servicio exige lo demás.

### Hora de Lima (`modules/event/lib/lima-datetime.ts`, puro) y formato
```ts
export function limaDateTimeToDate(date: string, time: string): Date | null; // `${date}T${time}:00-05:00`; null si formato inválido o fecha imposible (round-trip)
// modules/event/lib/format.ts
export function isoToLimaTime(iso: string): string; // "HH:mm" en America/Lima (hora 24, "21:00")
```

### Publicación (`modules/event/lib/event-publish.ts`, puro)
```ts
export type PublishIssueCode = "title-required" | "category-required" | "venue-required" | "city-required" | "starts-at-past" | "no-tiers" | "no-capacity";
export interface PublishIssue { field: "title" | "categoryId" | "venueName" | "city" | "date" | "tiers"; code: PublishIssueCode }
export function checkPublishable(
  c: { title: string; categoryId: string | null; venueName: string; city: string; startsAt: Date; tiers: { capacity: number }[] },
  now: Date,
  opts: { checkDate: boolean }, // false al editar un published cuya fecha no cambió
): PublishIssue[];
export const PUBLISH_MESSAGES: Record<PublishIssueCode, string>; // es-PE, tuteo
```

### Congelamiento (`modules/event/lib/event-freeze.ts`, puro)
```ts
export interface CurrentTier { id: string; name: string; priceCents: number; capacity: number; maxPerOrder: number; paid: number; reserved: number; orderItems: number }
export interface EventPlace { startsAt: Date; venueName: string; address: string; city: string }
export type FreezeIssueCode =
  | "tier-not-found" | "duplicate-tier-id" | "tier-price-locked" | "tier-name-locked"
  | "tier-capacity-below-committed" | "tier-remove-locked" | "tier-remove-has-orders" | "buyer-impact-unacknowledged";
export interface FreezeIssue { code: FreezeIssueCode; tierId?: string; min?: number }
export function committed(t: Pick<CurrentTier, "paid" | "reserved">): number; // paid + reserved
export function checkFrozenEdit(
  current: { place: EventPlace; tiers: CurrentTier[] },
  next: { place: EventPlace; tiers: TierInput[] },
  acknowledgeBuyerImpact: boolean,
): FreezeIssue[];
export const FREEZE_MESSAGES: Record<FreezeIssueCode, (i: FreezeIssue) => string>;
```
`hasSales` = algún tipo con comprometido > 0. Con `hasSales`, cualquier diferencia de `startsAt` (por `getTime()`), `venueName`, `address` o `city` sin ack → `buyer-impact-unacknowledged`. Sin ventas: solo `tier-not-found`, `duplicate-tier-id` y `tier-remove-has-orders`.

### Slug (`modules/event/lib/event-slug.ts`, puro)
```ts
export function slugify(s: string): string; // movido desde db/seed/mock-to-rows.ts, idéntico
export function slugBase(title: string): string;                       // slugify, ≤ 60, sin guion final, "evento" si vacío
export function uniqueSlug(base: string, taken: ReadonlySet<string>, random: () => string): string; // base si libre; si no `${base}-${random()}` hasta que no esté en `taken`
```

### Portada (`modules/event/lib/cover-image.ts`, puro)
```ts
export type CoverMime = "image/jpeg" | "image/png" | "image/webp";
export function sniffImageType(head: Uint8Array): CoverMime | null; // por magic bytes
export type CoverCheck =
  | { ok: true; mime: CoverMime; ext: "jpg" | "png" | "webp" }
  | { ok: false; reason: "empty" | "too-large" | "unsupported-type" | "mime-mismatch" };
export function validateCover(file: { size: number; type: string }, head: Uint8Array): CoverCheck;
export function coverPathname(eventId: string, ext: "jpg" | "png" | "webp", uuid: string): string; // `events/${eventId}/${uuid}.${ext}`
export function isBlobUrl(url: string | null): boolean; // https y host termina en ".public.blob.vercel-storage.com"
```

### Schemas (`modules/event/schemas/event-save-schema.ts`, client-safe; `z.object` descarta extras)
```ts
const plain = (max: number) => z.string().trim().min(1).max(max) /* + sin HTML, sin control/bidi, espacios colapsados */;
export const tierInputSchema = z.object({
  id: z.uuid().optional(), name: plain(EVENT_LIMITS.tierNameMax),
  priceCents: z.number().int().min(0).max(EVENT_LIMITS.maxPriceCents),
  capacity: z.number().int().min(0).max(EVENT_LIMITS.maxCapacity),
  maxPerOrder: z.number().int().min(1).max(EVENT_LIMITS.maxPerOrderLimit).default(EVENT_LIMITS.defaultMaxPerOrder),
});
export const saveEventSchema = z.object({
  id: z.uuid().optional(), expectedUpdatedAt: z.iso.datetime().optional(),
  title: plain(EVENT_LIMITS.titleMax), categoryId: z.uuid(),
  description: /* ≤ 5000, "" permitido, conserva \n, sin HTML/control/bidi */,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  venueName: plain(EVENT_LIMITS.venueMax), address: /* "" o ≤ 200 */, city: plain(EVENT_LIMITS.cityMax),
  tiers: z.array(tierInputSchema).max(EVENT_LIMITS.maxTiers),
  publish: z.boolean().default(false), acknowledgeBuyerImpact: z.boolean().default(false),
}).superRefine(/* id ⇒ expectedUpdatedAt; nombres de tipos únicos (insensible a mayúsculas); limaDateTimeToDate(date, startTime) no null */);
export const transitionEventSchema = z.object({ id: z.uuid(), action: z.enum(["publish", "unpublish", "cancel"]) });
export const moderateEventSchema   = z.object({ id: z.uuid(), action: z.enum(["suspend", "reactivate", "cancel"]) });
export const deleteEventSchema     = z.object({ id: z.uuid() });
// modules/event/lib/field-errors.ts (puro)
export function zodErrorToFieldErrors(error: z.ZodError): Record<string, string>;      // primer mensaje por ruta ("tiers.0.name")
export function publishIssuesToFieldErrors(issues: PublishIssue[]): Record<string, string>;
export function freezeIssuesToFieldErrors(issues: FreezeIssue[], tiers: TierInput[]): Record<string, string>; // tierId → índice del payload; place → "date"
```

### Servicios de servidor (`modules/event/services/*`, exportados por `server.ts`)
```ts
// event-error.ts
export class EventError extends Error { code: EventErrorCode; fieldErrors?: Record<string, string> }
// event-audit.ts
export function logEventAudit(e: { action: string; eventId: string; actorId: string; from?: EventDbStatus; to?: EventDbStatus; ack?: boolean }): void; // console.info JSON
// event-sales.ts
export async function lockAndLoadTiers(tx: Tx, eventId: string): Promise<CurrentTier[]>; // 1) SELECT id … FOR UPDATE  2) agregado paid / reserved (pending y expires_at > now()) / count(order_items) por tipo (bigint → Number seguro)
// event-save-service.ts
export async function saveEvent(actor: { id: string }, input: SaveEventInput, now = new Date()): Promise<{ id: string; status: EventDbStatus; updatedAt: string }>;
// event-status-service.ts
export async function transitionEvent(actor: { id: string }, i: { id: string; action: TransitionAction }, now = new Date()): Promise<{ status: EventDbStatus; title: string }>;
export async function moderateEvent(actor: { id: string }, i: { id: string; action: ModerationAction }): Promise<{ status: EventDbStatus; title: string }>;
export async function deleteEvent(actor: { id: string }, i: { id: string }): Promise<{ title: string }>;
// event-read-service.ts
export async function getEventForEdit(actorId: string, id: string): Promise<EventEditData | null>; // null si no existe o no es del actor
export async function listCategories(): Promise<{ id: string; name: string }[]>; // por sort_order
// event-cover-service.ts
export async function setEventCover(actor: { id: string }, id: string, file: File): Promise<{ coverImageUrl: string }>; // valida (cover-image), put, UPDATE con propiedad, del viejo best-effort
export async function removeEventCover(actor: { id: string }, id: string): Promise<void>;
```
`saveEvent` (transacción): bloquea evento con `organizer_id = actor.id` (si hay `id`) → `not-found`; estado editable; `stale`; `lockAndLoadTiers`; categoría existe; calcula `startsAt`; `checkFrozenEdit` si es `published`; `checkPublishable` si publica o ya es `published`; slug (D16); `UPDATE`/`INSERT`; sincroniza tipos (borrar → actualizar → insertar; `23505` sobre `ticket_types_event_id_name_unique` → `fieldErrors` en ese tipo, `// ponytail: intercambiar nombres entre dos tipos en un mismo guardado falla; hacerlo en dos pasos`); `status`/`published_at` si publica; `logEventAudit`. `transitionEvent`/`moderateEvent`: bloquea fila (dueño: con `organizer_id`), `allowedActions` debe incluir la acción (si no, `invalid-transition`), `unpublish` exige comprometido = 0 (`has-sales`), `publish` revalida `checkPublishable(checkDate: true)` sobre lo guardado. `deleteEvent`: ver AC18. Ninguna devuelve `organizerId`.

### Acciones (`modules/event/actions/event-actions.ts`, `"use server"`)
```ts
export async function saveEventAction(input: unknown): Promise<EventActionResult>;       // manage-own; notice: "Tu evento se publicó." | "Guardamos tu borrador." | "Guardamos los cambios."
export async function transitionEventAction(input: unknown): Promise<EventActionResult>; // manage-own
export async function moderateEventAction(input: unknown): Promise<EventActionResult>;   // moderate
export async function deleteEventAction(input: unknown): Promise<EventActionResult>;     // manage-own
```
`run(permission, schema, input, fn)` como en `user-admin-actions.ts`: `requirePermission` → `safeParse` (error → `fieldErrors` vía `zodErrorToFieldErrors`) → servicio → `EventError` mapeado a mensaje fijo por código (`ERROR_MESSAGES: Record<EventErrorCode, string>`, tuteo, sin detalles) conservando `code` y `fieldErrors` → cualquier otro error: `console.error` + mensaje genérico. Sin `revalidatePath` (las páginas son dinámicas por la sesión y las listas viven en React Query); el cliente invalida `["events"]`.

### Route handler (`app/api/events/[id]/cover/route.ts`, delgado)
```ts
export async function POST(req: NextRequest, ctx: RouteContext<"/api/events/[id]/cover">): Promise<Response>;
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/events/[id]/cover">): Promise<Response>;
// 1) Sec-Fetch-Site === "cross-site" → 403  2) id uuid (si no 404)  3) requirePermission("events:manage-own") → AuthorizationError → 401/403 (statusForAuthError)
// 4) POST: Content-Length > coverMaxBytes + 64 KiB → 413; formData().get("file") instanceof File  5) setEventCover/removeEventCover; EventError → 404|409|413|415|502|503
// 200 { coverImageUrl } (POST) | 204 (DELETE); respuestas con Cache-Control: private, no-store; inesperado → 500 { error: "internal" }
```
Firma de `RouteContext`/params asíncronos: confirmar en `node_modules/next/dist/docs/` antes de implementar (AGENTS.md).

### Hook cliente (`modules/event/hooks/use-event-mutations.ts`)
```ts
"use client";
export function useEventMutations(): {
  save: (input: SaveEventInput) => Promise<EventActionResult>;
  transition: (i: { id: string; action: TransitionAction }) => Promise<EventActionResult>;
  moderate: (i: { id: string; action: ModerationAction }) => Promise<EventActionResult>;
  remove: (id: string) => Promise<EventActionResult>;
  isPending: boolean;
}; // useMutation por acción; en result.ok → queryClient.invalidateQueries({ queryKey: ["events"] })
```

### Exports de `modules/event`
`index.ts` (client-safe, se suman): `saveEventAction`, `transitionEventAction`, `moderateEventAction`, `deleteEventAction`, `useEventMutations`, `allowedActions`, `EVENT_LIMITS`, `saveEventSchema`, `checkPublishable`, `PUBLISH_MESSAGES`, `zodErrorToFieldErrors`, `publishIssuesToFieldErrors`, `limaDateTimeToDate`, `isoToLimaTime`, `EventActionDialog`, `ModerationEventsPage`, y los tipos de `event-write`. `server.ts` (se suman): `saveEvent`, `transitionEvent`, `moderateEvent`, `deleteEvent`, `getEventForEdit`, `listCategories`, `setEventCover`, `removeEventCover`, `EventError`.

### Componentes
```ts
// modules/event/lib/event-action-copy.ts (puro)
export function getActionCopy(action: "cancel" | "delete" | "suspend", ctx: { title: string; sold: number }): { title: string; description: string; confirm: string };
// modules/event/components/event-action-dialog.tsx ("use client"; AlertDialog; foco inicial en Cancelar; muestra el error del servidor dentro y queda abierto)
EventActionDialog(props: { event: Pick<ManagedEventItem, "id" | "title"> & { sold: number } | null; action: "cancel" | "delete" | "suspend" | null; mode: "owner" | "moderator"; onOpenChange: (o: boolean) => void; onDone: (notice: string) => void })
// modules/event/components/moderation-events-page.tsx ("use client"): ModerationEventsPage()   // useEvents("all") + useEventMutations().moderate
// modules/organizer/components/event-row-actions.tsx
EventRowActions(props: { event: ManagedEventItem; onNotice: (notice: string) => void; triggerClassName: string })  // Editar (Link), Ver ventas (EventSalesSheet), DropdownMenu, EventActionDialog
// modules/organizer/components/event-form.tsx
EventForm(props: { categories: { id: string; name: string }[]; initial?: EventEditData; coverFailed?: boolean })
// modules/organizer/components/event-form-cover.tsx
EventFormCover(props: { previewUrl: string | null; onChange: (file: Blob | null) => void })   // null = quitar; el Blob es el JPEG comprimido
// modules/organizer/components/event-form-tiers.tsx (se suman)
//   tier: TierDraft con { committed: number; hasOrders: boolean } opcionales → inputs deshabilitados / min / sin quitar (AC25)
// modules/organizer/components/event-form-impact-dialog.tsx
EventFormImpactDialog(props: { open: boolean; onConfirm: () => void; onCancel: () => void })
// modules/organizer/types/event-form.ts, lib/event-draft.ts (puros)
export interface TierDraft { id: string; serverId?: string; name: string; price: string /* soles */; quantity: string; maxPerOrder: number; committed: number; hasOrders: boolean }
export interface EventDraft { title: string; categoryId: string; description: string; date: string; startTime: string; venueName: string; address: string; city: string; tiers: TierDraft[] }
export function solesToCents(price: string): number; // "12.5" → 1250; "" o inválido → NaN (Zod lo rechaza); sin flotantes: Math.round(Number(x) * 100) tras validar /^\d+(\.\d{1,2})?$/
export function buildSaveInput(draft: EventDraft, opts: { id?: string; expectedUpdatedAt?: string; publish: boolean; acknowledgeBuyerImpact: boolean }): SaveEventInput; // descarta filas de tipo totalmente vacías
export function draftFromEditData(data: EventEditData): EventDraft;
export function createEventDraft(defaultCategoryId: string): EventDraft;
// getTotalCapacity / getMinPrice se conservan sobre TierDraft
// modules/organizer/lib/image-compress.ts (browser-only)
export async function compressImage(file: File): Promise<Blob>; // JPEG q 0.8, ancho ≤ 1280
export type SavedNotice = "published" | "draft" | "updated"; // organizer-dashboard.tsx; app/organizer/page.tsx valida contra ["published","draft","updated"]
```

## Edge cases
- **Evento ajeno por id** (editar, transicionar, eliminar, subir portada): `not-found`/404 idéntico al inexistente. El moderador no tiene "editar": no hay ruta que ofrecerle.
- **Rol insuficiente**: `customer` en cualquier acción → `forbidden`; `organizer` en `moderateEventAction` → `forbidden`; `admin` en `/super-admin` no cambia nada aquí.
- **Usuario `suspended`** con sesión vigente: `requirePermission` lo corta (AC2), también en el route handler.
- **Evento con ventas parciales**: tipo A vendido, tipo B no: B se edita/elimina libre, A congelado (D5); fecha/lugar piden ack (D6).
- **Órdenes `pending` vigentes**: cuentan como comprometido (bloquean precio, capacidad, despublicar y quitar tipo). Si vencen entre la carga del formulario y el guardado, el servidor decide con el estado real bajo lock (el formulario puede haber mostrado un tipo "congelado" ya libre: se vuelve a cargar al fallar).
- **Órdenes `expired`/`refunded` únicamente**: no congelan precio/capacidad, pero el tipo no se puede borrar (FK) → `tier-remove-has-orders`, mensaje "retíralo con capacidad 0". El evento tampoco se puede eliminar (`has-orders`); se cancela.
- **Doble envío / doble clic**: el formulario deshabilita botones; en servidor, publicar dos veces → la segunda ve `published` y responde `invalid-transition`; crear dos veces el mismo borrador crea dos eventos (sin idempotency key, `// ponytail:` aceptado: el tope de 200 y el listado lo acotan).
- **Carrera publicar vs eliminar**: ambas bloquean la fila; la segunda recibe `not-found`/`invalid-transition`. **Carrera eliminar vs checkout**: el `DELETE` cascade necesita los locks de `ticket_types` que tiene el checkout; si el pedido se confirma primero, la FK da `23503` → `has-orders`; si gana el borrado, el checkout no encuentra los tipos.
- **Slug duplicado**: `uniqueSlug` agrega sufijo; carrera de dos creaciones simultáneas con el mismo título → una recibe `slug-conflict`.
- **Fecha pasada**: publicar o cambiar fecha a una pasada → `starts-at-past` en el campo fecha; un `published` ya pasado se sigue editando si la fecha no cambia (`checkDate: false`). Un borrador con fecha pasada se guarda (solo se exige al publicar).
- **Capacidad bajo lo vendido**: `tier-capacity-below-committed` con el mínimo en el mensaje. `sold > capacity` previo (datos viejos) no bloquea editar otros campos mientras no se baje más.
- **Tipo de entrada de otro evento / id repetido**: `tier-not-found` / `duplicate-tier-id`, sin escritura alguna.
- **Imagen inválida / gigante / MIME falso**: `.exe` renombrado a `.jpg` con `type` falso → magic bytes no coinciden → 415; > 2 MiB → 413; SVG → 415. El cliente además rechaza > 15 MB y archivos ilegibles.
- **Token de Blob ausente**: 503 `storage-unavailable`; el guardado del evento ya ocurrió → AC21 muestra el aviso y el resto del CRUD funciona. **Blob caído** (`put` lanza): 502, BD intacta. **`del` falla**: se loguea, la operación sigue.
- **Evento `cancelled`/`suspended`**: no editable ni con portada nueva (409); el dueño de un `suspended` no puede cancelar ni eliminar; su dashboard lo muestra con badge y sin acciones, salvo "Ver ventas".
- **Edición concurrente en dos pestañas**: la segunda guardada ve `stale` (D8) y debe recargar; el formulario conserva lo tipeado hasta que el usuario recarga (no se pierde el trabajo por un redirect). Transiciones: gana la primera, la otra `invalid-transition`.
- **Borrador con data URL local (legacy)**: se ignora (D12); el campo `image` jamás llega al servidor (`coverImageUrl` no existe en los schemas) y la clave de localStorage se borra.
- **Seed**: eventos con `cover_image_url = /images/...` se editan normal; al reemplazar su portada no se llama `del` (no es URL de Blob). `next/image` sigue con `unoptimized` para URLs no locales; cuando el catálogo público migre habrá que agregar `images.remotePatterns` para `*.public.blob.vercel-storage.com`.
- **Organizador de eventos suspendido como persona**: sus eventos siguen publicados hasta que un moderador los suspenda (hueco documentado).
- **Cancelar con ventas**: las órdenes `paid` y sus entradas (`valid`) quedan intactas; no hay reembolso ni aviso. Hueco hasta la spec de reembolsos (system-design §3 paso 5 es manual de admin).
- **Hosting**: `system-design.md` §1 dice Cloud Run, el requerimiento habla de Vercel. El SDK de Blob es HTTP: funciona desde cualquiera con el token. El límite de 4.5 MB es de Vercel (Cloud Run admite 32 MiB); el diseño queda por debajo de ambos (2 MiB).
- **Sin categorías** en BD: el formulario avisa y no guarda. **Más de 10 tipos / sin tipos al publicar**: error de campo `tiers`.

## Tests
Sin tests de BD, Blob ni componentes (SETUP §3). SQL, transacciones y locks se verifican por lectura del reviewer (propiedad en el `WHERE`, `FOR UPDATE` antes de agregar ventas, `FILTER` de `paid` y `pending` vigente, `23503` en el `DELETE`, ausencia de contar-y-borrar) y por la verificación manual. Runner: Vitest ya configurado (`**/*.test.ts`).
- `modules/auth/lib/permissions.test.ts` — AC1: `ALL` y `EXPECTED` con `events:moderate` (sin `events:suspend`) y `events:manage-own` para admin/super_admin; matriz rol × permiso completa.
- `lib/db-errors.test.ts` — (movido) `isForeignKeyViolation` plano, con `cause` anidado, otro código, no-error; nuevo `isUniqueViolation` (`23505`) y `pgConstraint` (lee `constraint` en la cadena `cause`).
- `modules/event/lib/event-transitions.test.ts` — AC6: tabla completa 4 estados × {owner, moderator, ambos, ninguno}; `suspended` sin acciones para el dueño; `cancelled` solo `delete`; el moderador nunca `edit`/`delete`; sin duplicados en "ambos"; `nextStatus` de cada acción.
- `modules/event/lib/lima-datetime.test.ts` y `format.test.ts` — AC11: `limaDateTimeToDate("2026-11-14","21:00")` = `2026-11-15T02:00:00.000Z`; `"2026-02-30"`, `"2026-13-01"`, `"24:00"`, `"9:00"`, vacío → `null`; `isoToLimaTime("2026-11-15T02:00:00Z") === "21:00"` y medianoche `"00:00"`.
- `modules/event/lib/event-publish.test.ts` — AC7: evento válido → `[]`; cada código por separado; varios a la vez con su `field`; fecha igual a `now` y 1 ms después; `checkDate: false` ignora fecha pasada; capacidades 0 → `no-capacity`; `no-tiers`; `PUBLISH_MESSAGES` cubre todos los códigos.
- `modules/event/lib/event-freeze.test.ts` — AC5, AC15, AC16: sin ventas → solo `tier-remove-has-orders`/ids inválidos; con `paid` y con `reserved` (por separado) cada regla: precio, nombre, capacidad (`min` = comprometido, igual al comprometido permitido, uno menos prohibido), quitar; tipo solo con `orderItems` → no se quita pero precio libre; agregar tipo nuevo libre; `maxPerOrder` libre; id ajeno → `tier-not-found`; ids repetidos; lugar/fecha/ciudad/dirección con ventas sin y con ack; sin ventas no pide ack; `FREEZE_MESSAGES` cubre todos los códigos.
- `modules/event/lib/event-slug.test.ts` — AC13: `slugify` (acentos, símbolos; mismos casos que usa el seed), `slugBase` (≤ 60, sin guion final, `evento` vacío), `uniqueSlug` (libre → base; ocupado → con sufijo; sufijo ocupado → reintenta con el siguiente `random`).
- `modules/event/lib/cover-image.test.ts` — AC20: `sniffImageType` con cabeceras reales de JPEG/PNG/WebP, GIF, SVG (`<svg`), vacío y bytes aleatorios → `null`; `validateCover` ok por formato, `empty`, `too-large` (2 MiB exactos ok, +1 no), `unsupported-type` (`image/svg+xml`, `image/gif`), `mime-mismatch` (PNG declarado como JPEG); `coverPathname`; `isBlobUrl` (host válido, `http:`, host que solo *contiene* el dominio, `/images/x.jpg`, `null`).
- `modules/event/schemas/event-save-schema.test.ts` — AC3, AC10: ejemplo válido; `organizerId`/`status`/`slug`/`coverImageUrl`/`publishedAt` descartados; cada límite (largo, precio, capacidad, 11 tipos); HTML `<script>`/`<b>` rechazado y `a < b` permitido; caracteres de control y bidi; nombres de tipo duplicados insensibles a mayúsculas; `id` sin `expectedUpdatedAt`; `date` y `startTime` inválidos y fecha imposible; `maxPerOrder` por defecto; `publish`/`acknowledgeBuyerImpact` por defecto `false`; schemas de transición, moderación y borrado (acción inválida, id no uuid; `suspend` no vale en `transition`).
- `modules/event/lib/field-errors.test.ts` — AC24: rutas `tiers.0.name`; primer mensaje por ruta; issues de publicación y de congelamiento mapeados a campos/índices (`tierId` → posición; lugar/fecha → `date`).
- `modules/event/lib/event-action-copy.test.ts` — AC19, AC26: cancelar sin ventas / con ventas (menciona reembolso manual y compradores sin aviso), eliminar, suspender.
- `modules/organizer/lib/event-draft.test.ts` — AC24: `solesToCents` (`"12.5"`→1250, `"0.1"`→10, `"1.005"`→NaN, `""`→NaN, `"-1"`→NaN); `buildSaveInput` descarta filas vacías, usa posición, conserva `serverId` como `id` y `maxPerOrder`; `draftFromEditData` ida y vuelta (centavos → soles); `getTotalCapacity`/`getMinPrice`.
- `components/shared/panel-nav.test.ts` — AC27: `admin` y `super_admin` ven "Eventos" habilitado en Administración; `organizer` y `customer` no lo ven; ruta activa `/admin/events`.
- Se quitan los tests de `buildOrganizerEvent`/`draftFromEvent` del store local (Fase 6) y los de `image-data-url` si existieran.

Verificación manual (humano, tras los pasos manuales y con un organizador del seed): crear borrador y publicarlo; editar y cambiar portada (URL de `*.public.blob.vercel-storage.com`, abrir en incognito); despublicar; cancelar; eliminar un borrador; crear una orden `paid` a mano en la BD y comprobar que precio/capacidad/quitar tipo se bloquean y que eliminar responde `has-orders`; con admin moderar desde `/admin/events`; probar `?scope=published` tras suspender; subir un `.txt` renombrado a `.jpg` (415) y quitar `BLOB_READ_WRITE_TOKEN` (503, resto funciona).

## Plan

### Phase 1 — Permisos, helper de errores de BD, límites, estados y tipos (puro; la app no cambia)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: `events:manage-own` a admin/super_admin y `events:suspend` → `events:moderate` (+ matriz del test); mover `db-errors` a `lib/` (+ `isUniqueViolation`, `pgConstraint`) y actualizar el import de `users` | modules/auth/lib/permissions.ts, modules/auth/lib/permissions.test.ts, lib/db-errors.ts, lib/db-errors.test.ts, modules/users/lib/db-errors.ts, modules/users/lib/db-errors.test.ts, modules/users/services/user-admin-service.ts | - | A | AC1 | done |
| T2 | Límites, máquina de estados con test y tipos de escritura | modules/event/lib/event-limits.ts, modules/event/lib/event-transitions.ts, modules/event/lib/event-transitions.test.ts, modules/event/types/event-write.ts | - | B | AC6 | done |

### Phase 2 — Reglas puras de negocio (sin BD, sin UI)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | Hora de Lima: `limaDateTimeToDate` e `isoToLimaTime`, con tests | modules/event/lib/lima-datetime.ts, modules/event/lib/lima-datetime.test.ts, modules/event/lib/format.ts, modules/event/lib/format.test.ts | Phase 1 | A | AC11 | done |
| T2 | Reglas de publicación con test | modules/event/lib/event-publish.ts, modules/event/lib/event-publish.test.ts | Phase 1 | A | AC7 | done |
| T3 | Congelamiento con ventas con test | modules/event/lib/event-freeze.ts, modules/event/lib/event-freeze.test.ts | Phase 1 | A | AC5, AC15, AC16 | done |
| T4 | Slug (`slugify` movido, `slugBase`, `uniqueSlug`) con test; el seed importa `slugify` | modules/event/lib/event-slug.ts, modules/event/lib/event-slug.test.ts, db/seed/mock-to-rows.ts | Phase 1 | A | AC13 | done |

### Phase 3 — Dependencias, schemas y errores de campo
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: `npm i @vercel/blob`; `BLOB_READ_WRITE_TOKEN` opcional en `lib/env.ts` y `.env.example`; `npx shadcn@latest add dropdown-menu` | package.json, package-lock.json, lib/env.ts, .env.example, components/ui/dropdown-menu.tsx | - | A | AC20 | todo |
| T2 | Schemas Zod (guardar, transición, moderación, borrado) con test | modules/event/schemas/event-save-schema.ts, modules/event/schemas/event-save-schema.test.ts | Phase 2 | B | AC3, AC10 | todo |
| T3 | Mapeo de issues a errores de campo con test | modules/event/lib/field-errors.ts, modules/event/lib/field-errors.test.ts | Phase 2 | B | AC24 | todo |

### Phase 4 — Servicios de servidor y portada (BD/Blob; nadie los consume todavía)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | Validación pura de portada con test | modules/event/lib/cover-image.ts, modules/event/lib/cover-image.test.ts | Phase 3 | A | AC20 | todo |
| T2 | setup de servidor: `EventError`, log de auditoría, `lockAndLoadTiers` (lock + agregado de ventas) | modules/event/services/event-error.ts, modules/event/services/event-audit.ts, modules/event/services/event-sales.ts | Phase 3 | A | AC14, AC15, AC29 | todo |
| T3 | `saveEvent` (crear/actualizar/publicar, slug, tipos, congelamiento, optimista) | modules/event/services/event-save-service.ts | T2 | B | AC4, AC5, AC8, AC12, AC13, AC14, AC15, AC16, AC17 | todo |
| T4 | `transitionEvent`, `moderateEvent`, `deleteEvent` (lock, compare-and-set, `23503`) | modules/event/services/event-status-service.ts | T2 | B | AC4, AC8, AC18, AC19 | todo |
| T5 | `getEventForEdit`, `listCategories`, `setEventCover`, `removeEventCover` | modules/event/services/event-read-service.ts, modules/event/services/event-cover-service.ts | T1, T2 | B | AC4, AC20, AC23 | todo |

### Phase 5 — Acciones, route handler de portada, hook y entradas (la UI vieja sigue funcionando)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | Server Actions con `run` (permiso → Zod → servicio → mensaje fijo) | modules/event/actions/event-actions.ts | Phase 4 | A | AC2, AC3, AC29 | todo |
| T2 | Route handler `POST|DELETE /api/events/[id]/cover` | app/api/events/[id]/cover/route.ts | Phase 4 | A | AC20 | todo |
| T3 | Hook `useEventMutations` (invalida `["events"]`) | modules/event/hooks/use-event-mutations.ts | T1 | B | AC24, AC26 | todo |
| T4 | Wire: `server.ts` (servicios) e `index.ts` (acciones, hook, reglas puras, tipos) | modules/event/server.ts, modules/event/index.ts | T1, T3 | C | AC30 | todo |

Nota Fase 5: cierra con `npm run build` (AC30).

### Phase 6 — Formulario conectado a la BD (crear y editar)
Los tipos locales viejos (`organizer-event.ts`) y el store siguen existiendo (solo el dashboard usa `OrganizerEventStatus`) hasta la Fase 9. Hasta la Fase 7 el aviso `?saved=` del dashboard no conoce `updated` y conserva su copy viejo: se corrige allí.
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: tipos del formulario, `event-draft.ts` (soles↔céntimos, `buildSaveInput`, `draftFromEditData`) con test, `compressImage`; borrar `image-data-url.ts` | modules/organizer/types/event-form.ts, modules/organizer/lib/event-draft.ts, modules/organizer/lib/event-draft.test.ts, modules/organizer/lib/image-compress.ts, modules/organizer/lib/image-data-url.ts | Phase 5 | A | AC22, AC24 | todo |
| T2 | `EventFormCover` con `Blob` y vista previa por URL | modules/organizer/components/event-form-cover.tsx | T1 | B | AC22 | todo |
| T3 | `EventFormTiers` con tipos congelados (deshabilitados, `min`, sin quitar) y errores por campo | modules/organizer/components/event-form-tiers.tsx | T1 | B | AC25 | todo |
| T4 | `EventForm` (crear/editar, validación cliente, errores de servidor, ack de impacto, subida de portada posterior), vista previa y diálogo de impacto | modules/organizer/components/event-form.tsx, modules/organizer/components/event-form-preview.tsx, modules/organizer/components/event-form-impact-dialog.tsx | T1, T2, T3 | C | AC21, AC24, AC25 | todo |
| T5 | Páginas `new` (con categorías) y `[id]/edit` (con `getEventForEdit`, `notFound`, `?cover=failed`) | app/organizer/events/new/page.tsx, app/organizer/events/[id]/edit/page.tsx | T4 | D | AC23 | todo |

### Phase 7 — Dashboard: acciones por fila
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: copy de diálogos con test, `EventActionDialog` y su export | modules/event/lib/event-action-copy.ts, modules/event/lib/event-action-copy.test.ts, modules/event/components/event-action-dialog.tsx, modules/event/index.ts | Phase 6 | A | AC19, AC26 | todo |
| T2 | `EventRowActions` (Editar, Ver ventas, menú, diálogos) | modules/organizer/components/event-row-actions.tsx | T1 | B | AC26 | todo |
| T3 | `OrganizerDashboard` (acciones por fila, columna de acciones, avisos `?saved=` reales y de acciones) y validación de `saved` en la página | modules/organizer/components/organizer-dashboard.tsx, app/organizer/page.tsx | T2 | C | AC26 | todo |

### Phase 8 — Moderación en `/admin/events`
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | `ModerationEventsPage` y su export | modules/event/components/moderation-events-page.tsx, modules/event/index.ts | Phase 7 | A | AC27, AC28 | todo |
| T2 | Rutas `app/admin` (layout `admin:panel`, página `events:moderate`) | app/admin/layout.tsx, app/admin/events/page.tsx | Phase 7 | A | AC27 | todo |
| T3 | Ítem "Eventos" en el menú + test | components/shared/panel-nav.ts, components/shared/panel-nav.test.ts | Phase 7 | A | AC27 | todo |

Nota Fase 8: T2 importa `ModerationEventsPage` de T1; `tsc` pasa al cierre de la fase.

### Phase 9 — Limpieza y documentación
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | Borrar `useOrganizerStore` y `organizer-event.ts`; `PersistedStores` sin el store y con borrado único de `ticketera:organizer`; `organizer/index.ts` sin exports muertos | modules/organizer/store/use-organizer-store.ts, modules/organizer/types/organizer-event.ts, components/shared/persisted-stores.tsx, modules/organizer/index.ts | Phase 8 | A | AC32 | todo |
| T2 | Docs: system-design (§1 Blob y env, §2 permisos y A3, sección "CRUD de eventos", §3 integración del checkout, casos borde) y mer (`events`, transiciones, huecos) | docs/architecture/system-design.md, docs/architecture/mer.md | Phase 8 | A | AC9, AC32 | todo |

Nota Fase 9: cierra con `npm run build` y los `grep` de AC32.

## Pasos manuales (humano, no los hace el developer)
- H1 **Crear el Blob store** en Vercel: proyecto → Storage → Create → Blob, con acceso **público** (el código usa `access: "public"`). Recomendado: un store para desarrollo y otro para producción.
- H2 **Token**: copiar `BLOB_READ_WRITE_TOKEN` del store a `.env.local` (o `vercel env pull`) y, en producción, al gestor de secretos del ambiente (system-design §1: Secret Manager en Cloud Run, o variables de Vercel si se despliega allí). Sin token el CRUD funciona pero subir portada responde 503.
- H3 **Verificar**: subir una portada, abrir su URL (`https://<store>.public.blob.vercel-storage.com/events/<id>/<uuid>.jpg`) en una ventana privada y comprobar que se ve; reemplazarla y confirmar que la anterior desaparece del store (`del` best-effort).
- H4 **Sembrar y promover** (como en la spec anterior): `npm run db:seed -- --organizer <email>` para tener categorías (el formulario las lee de la BD) y un organizador con el que probar; para probar moderación, un usuario `admin` o `super_admin`.
- H5 (opcional, antes de migrar el catálogo público) agregar `images.remotePatterns` para `*.public.blob.vercel-storage.com` en `next.config.ts`; hoy las portadas se muestran `unoptimized`.

## Open questions
Resueltas por el usuario (2026-10-09): se aceptan los defaults de Q1–Q5 y Q7; Q6 se decide en la tarea de despliegue (en local el token va en `.env.local`). Texto original:
- Q1 (D11) Un borrador exige título, categoría, fecha, hora, lugar y ciudad (por las columnas NOT NULL; cero migraciones). Alternativa: hacer nullable `starts_at`/`venue_name`/`city` con migración Drizzle y manejar `null` en listados. Default: la primera.
- Q2 (D5) El **nombre** de un tipo con ventas también se congela (no estaba en el requerimiento; `order_items` no guarda snapshot del nombre). Default: congelado.
- Q3 (D6) Cambiar fecha/lugar con ventas: permitido con confirmación explícita y log. Alternativa: bloquearlo (obliga a cancelar, y no hay reembolsos). Default: permitido con ack.
- Q4 (D1) `admin` y `super_admin` también pueden **crear** y gestionar eventos propios (`events:manage-own`), no solo "editar los suyos". Default: sí.
- Q5 (D4) "Fecha futura" = posterior a ahora (se puede publicar un evento de esta noche), a diferencia de `ensureFuture` del seed (día siguiente). Default: posterior a ahora.
- Q6 (hosting) `system-design.md` §1 dice Cloud Run y el requerimiento menciona Vercel: el diseño sirve en ambos (SDK de Blob por HTTP; tope propio de 2 MiB). Confirmar dónde se despliega para H2.
- Q7 (huecos documentados) Reembolsos y aviso a compradores al cancelar/cambiar fecha, y eventos de un organizador suspendido siguen a la venta: quedan para specs propias.
