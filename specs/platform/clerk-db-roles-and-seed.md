# Clerk ↔ BD: roles, permisos, panel super admin y seed de eventos

- Module: platform
- Status: done
- Approved by: lenadro291 (2026-10-05)
- Mode: SDD

## Goal
Conectar la autenticación de Clerk con la tabla `users` para manejar roles y permisos, con un panel donde el super admin (`linderhassinger01@gmail.com`) crea administradores y organizadores y gestiona sus roles y estado. Dejar listo (sin ejecutar) un seed que carga los eventos del mockdata en la BD, asociados a un organizador que se indica por parámetro.

## Scope
- In:
  - Cliente Drizzle (`db/index.ts`) y env vars nuevas.
  - Sincronización Clerk → `users`: webhook `POST /api/webhooks/clerk` más sincronización perezosa en `getCurrentUser()` para local sin túnel.
  - Asignación del `super_admin` por `SUPER_ADMIN_EMAIL` (solo con email verificado).
  - Roles y permisos como mapa en código (`can`, `requirePermission`).
  - Protección de rutas en `proxy.ts` por la matriz de acceso, más revalidación contra la BD en el layout de organizador.
  - Panel `/super-admin/users`: listar, crear admin/organizador, cambiar rol, suspender/reactivar. Espejo BD → Clerk `publicMetadata.role` y ban/unban.
  - Seed de categorías, eventos y tipos de entrada desde mockdata, con script npm. No se ejecuta.
  - Retiro de la sesión mock (`useSessionStore`, `/login`) para que quede un solo sistema de auth.
- Out:
  - Panel de administración de `admin` (suspender eventos y usuarios, A3): la ruta `/admin` queda reservada en el proxy, sin UI.
  - Autoservicio "Vender entradas" cliente → organizador (A1).
  - Tabla de permisos u overrides por usuario.
  - Crear más de un `super_admin` desde el panel.
  - Seed de `orders`, `order_items`, `tickets` y `payments`.
  - Link al panel en el header.
  - Stripe, Maps y emails.
  - Ejecutar el seed, migraciones o cualquier escritura contra Neon en esta tarea.

## Reuse
Reference: system-design §1 (env vars, reglas), §2 (Clerk → users, rol espejo, dos capas, matriz, A1–A3); mer.md `users`, `categories`, `events`, `ticket_types`.
- Reuse: `db/schema/*` — tablas y enums ya definidos y migrados (0000).
- Reuse: `@clerk/nextjs` 7.9 (`clerkMiddleware`, `createRouteMatcher`, `auth`, `clerkClient`, `@clerk/nextjs/webhooks` → `verifyWebhook`). Ya instalado; sin dependencias nuevas de auth.
- Reuse: `zod` (schemas del panel y env), `vitest` (`npm test`, `include: **/*.test.ts`).
- Reuse: `modules/event/services/event-service.ts` (`getEvents`, `getEventById` ya hacen el merge de `EVENTS` + `EVENT_DETAILS`) y `modules/purchase/services/venue-service.ts` (`buildEventVenue` ya calcula zonas y precios, incluido `roundTo5`). El seed los reutiliza para no duplicar la lógica de precios.
- Reuse: `modules/purchase/data/venues.ts` (`MAX_TICKETS_PER_ZONE` → `max_per_order`) y `EVENT_CATEGORIES` (→ `categories`).
- Reuse: `components/ui/{button,input,label,select,badge}` y `components/shared/page-loading`.
- Extend: `lib/env.ts` — agrega `SUPER_ADMIN_EMAIL` opcional.
- Extend: `.env.example` — vars nuevas.
- Extend: `app/organizer/layout.tsx` — guard de capa 2.
- Extend: `proxy.ts` — de `clerkMiddleware()` vacío a reglas por matriz.
- Extend: `modules/auth/index.ts` — pasa de exportar la sesión mock a exportar roles y permisos. Entrada nueva `modules/auth/server.ts` para lo que toca BD o Clerk Backend (ver Contracts).
- Extend: `docs/architecture/system-design.md` — `SUPER_ADMIN_EMAIL` ya no es solo del seed (A2 cambia), claims de sesión, panel.
- New: `modules/users/` — dominio de gestión de usuarios (panel super admin). `modules/auth` es identidad y sesión; el CRUD administrativo va aparte (SRP).
- New: `db/index.ts`, `db/seed/` — no existe cliente ni seed. Excepción de `db/` justificada en SETUP §1: transversal. El seed importa por ruta relativa los `services/` y `data/` del mockdata (no los `index.ts`, que arrastran componentes React que `tsx` no necesita cargar).
- Descartado: tabla `permissions` / `role_permissions` (YAGNI, ver D2). Descartado: invitaciones de Clerk (ver D4).

## Decisiones (propuestas, el usuario valida)
| #  | Decisión |
| -- | -------- |
| D1 | **Sync.** Webhook (`user.created`, `user.updated`, `user.deleted`) como camino principal. Local sin túnel: `getCurrentUser()` hace upsert perezoso si no hay fila. Ambos usan la misma función `syncClerkUser`. |
| D2 | **Permisos = derivados del rol.** Mapa `ROLE_PERMISSIONS: Record<Role, Permission[]>` en código, con `can(role, permission)`. "El super admin maneja permisos" = asigna roles. Una tabla de permisos o overrides por usuario no se justifica con 4 roles fijos y una matriz fija en system-design §2. Si aparece un permiso por usuario, entonces sí se migra a tabla. |
| D3 | **Super admin por email verificado.** Cambia A2: no hay seed de usuarios porque `users.clerk_user_id` es NOT NULL y la fila solo existe cuando la persona ya se registró en Clerk. La regla vive en el sync: si `email` verificado (case-insensitive) = `SUPER_ADMIN_EMAIL` → `super_admin`. Aplica al crear y en cualquier sync posterior. Nunca degrada. Email no verificado → nunca promueve. |
| D4 | **Crear admin/organizador = `clerkClient().users.createUser`** (sin contraseña, con `publicMetadata.role`) más upsert en `users`. No invitación: la fila en `users` necesita `clerk_user_id` y el rol debe existir desde el primer día, y con invitación ninguno de los dos existe hasta que el invitado acepta. La persona entra por Google con ese mismo email o con "Olvidé mi contraseña". Orden excepcional: Clerk primero (se necesita el id), luego BD; si falla la BD se compensa con `deleteUser`. |
| D5 | **Cambio de rol** (system-design §2): BD primero, luego `publicMetadata.role`. Si falla Clerk, la acción devuelve error y el reintento (idempotente, no hace corto-circuito si el rol ya coincide) vuelve a espejar. **Suspender/reactivar:** BD primero, luego `banUser`/`unbanUser`. |
| D6 | **Claims nunca bastan.** El proxy usa `sessionClaims.metadata.role` solo para bloquear rápido. Toda acción y todo layout protegido llama `requirePermission` (BD). Rol ausente en el claim (token viejo o dashboard sin configurar) = el proxy deja pasar si hay sesión y la capa 2 decide. Esto además resuelve el huevo-gallina del super admin: su primer ingreso a `/super-admin` dispara el sync perezoso y el espejo, y recién después el claim lleva el rol. |
| D7 | **Espejo siempre.** El primer sync escribe `publicMetadata.role` también para `customer`, así "claim ausente" significa "aún sin sincronizar" y no "cliente". |
| D8 | **Un solo `super_admin`.** El panel asigna `admin`, `organizer` y `customer`. No toca al `super_admin`, ni a uno mismo, ni asigna `super_admin`. |
| D9 | **Seed.** Fuente = catálogo (`EVENTS` + `EVENT_DETAILS`). `ORGANIZER_EVENTS` no se usa: son los mismos eventos del demo (3 con `catalogId` y la Feria como borrador duplicada), sus tiers y `sold` chocan con las zonas de `venues.ts` que usa el checkout, y `sold` sería ventas que no existen. `SAMPLE_ORDERS` no se usa: requiere comprador, tickets y pagos Yape (fuera por D4 de la spec anterior), y no se pidió. |
| D10 | **Solo eventos en PEN.** `events.ts` incluye `evt-006` (EUR, Madrid) y `evt-007` (USD, CDMX), pero el modelo es solo `PEN` (`price_cents` en céntimos de PEN, sin columna de moneda). Se omiten con un log por evento omitido. 8 de 10 eventos. |
| D11 | **Capacidad.** El mock no la tiene por zona. Zona numerada = cantidad de asientos de `buildEventVenue().sections`. Zona general = constante `GENERAL_ADMISSION_CAPACITY = 1000`. Zona `sold-out` del mock: se carga con su capacidad real (el seed parte de 0 ventas, así que ninguna zona nace agotada; actualizado después de la spec `real-data-dashboard`). `last-tickets` no se puede representar y queda como disponible. |
| D12 | **Fecha.** `starts_at = date + startTime` en `-05:00` (Lima, sin DST; los 8 eventos son de Lima y Arequipa). Si el día (Lima) del mock es hoy o anterior, la fecha se mueve de a años enteros hasta quedar después de hoy (`ensureFuture`): un seed nuevo nunca publica eventos vencidos. Estado `published`, `published_at` solo en el insert. `lat`/`lng` nulos. |

## Pasos manuales (humano, no los hace el developer)
- H1 **Clerk dashboard → Sessions → Customize session token**: agregar `{ "metadata": "{{user.public_metadata}}" }`. Sin esto el proxy no ve el rol y la capa 2 hace todo (seguro, pero sin bloqueo temprano).
- H2 **Webhook**: Clerk dashboard → Webhooks → endpoint `<url pública>/api/webhooks/clerk`, eventos `user.created`, `user.updated`, `user.deleted`. Copiar el *Signing Secret* a `CLERK_WEBHOOK_SIGNING_SECRET`. Es opcional en local (D1), obligatorio en prod.
- H3 **Cargar** `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_*` y `SUPER_ADMIN_EMAIL=linderhassinger01@gmail.com` en `.env.local` (y en Secret Manager en prod). La cuenta de Clerk con ese email debe estar registrada y verificada (Google la entrega verificada).
- H4 **Antes de correr el seed** (fuera de esta tarea): existir un usuario con rol `organizer` (se crea desde el panel, ver AC10) y ejecutar `npm run db:seed -- --organizer <email>`.

## Acceptance criteria
- AC1: `lib/env.ts` sigue exigiendo `DATABASE_URL` y agrega `SUPER_ADMIN_EMAIL` opcional: vacío o ausente = sin super admin, el valor se normaliza a minúsculas y debe ser email válido. Las claves de Clerk (`CLERK_SECRET_KEY`, `CLERK_WEBHOOK_SIGNING_SECRET`) no se validan ahí porque el SDK de Clerk las lee de `process.env`, así que su ausencia no rompe `next build` ni `proxy.ts`. `.env.example` documenta todas las vars nuevas.
- AC2: `db/index.ts` exporta `db` (Drizzle `node-postgres` con el schema completo y un único `Pool`, reutilizado entre recargas en dev).
- AC3: `POST /api/webhooks/clerk` verifica la firma con `verifyWebhook`. Firma inválida → 400. `user.created` crea la fila con `role = customer`, o `super_admin` si aplica D3, y espeja `publicMetadata.role`. `user.updated` actualiza email y nombre sin tocar `role` ni `status`. `user.deleted` deja `status = suspended` y conserva la fila. Error de BD → 500 (Clerk reintenta).
- AC4: `getCurrentUser()` devuelve `null` sin sesión. Con sesión y sin fila en `users` crea la fila (sync perezoso, sin webhook) y la devuelve. Con fila, la devuelve sin llamar a Clerk. Es idempotente.
- AC5: Solo un email primario **verificado** se persiste. Email primario no verificado → no se crea la fila. `super_admin` se asigna solo si el email verificado coincide (case-insensitive) con `SUPER_ADMIN_EMAIL`. El sync nunca degrada un rol existente ni cambia `role` por datos del payload de Clerk.
- AC6: `ROLE_PERMISSIONS` implementa exactamente la matriz de system-design §2. `can(role, permission)` y `parseRole(unknown)` (valor ausente o inválido → `customer`) están cubiertos con tests.
- AC7: `proxy.ts` aplica la matriz. Sin sesión, en `/checkout`, `/my-tickets`, `/organizer`, `/admin` o `/super-admin` → redirige a `/sign-in` con retorno. Con sesión y claim con rol insuficiente → redirige a `/`. Con sesión y claim ausente → deja pasar (D6). Rutas públicas, `/sign-in`, `/sign-up` y `/api/webhooks/clerk` no se bloquean. El proxy no importa `db` ni `lib/env`.
- AC8: `requirePermission(permission)` carga el usuario de la BD y lanza `AuthorizationError` (`unauthenticated` | `suspended` | `forbidden`) según la BD, ignorando los claims. `app/organizer/layout.tsx` la usa vía `requirePagePermission("organizer:panel")` (redirige a `/sign-in` o `/`).
- AC9: `/super-admin/users` solo renderiza para `super_admin` (proxy y `requirePagePermission("users:manage-roles")`). Lista nombre, email, rol, estado y fecha de alta.
- AC10: Crear usuario (email, nombre, rol `admin` | `organizer`) crea el usuario en Clerk con `publicMetadata.role` y la fila en `users` con ese rol. Email ya existente en `users` → error de campo sin llamar a Clerk. Si falla el insert en la BD, se borra el usuario recién creado en Clerk. Un webhook `user.created` que llegue antes que la fila no pisa el rol (el upsert de la acción fija el rol).
- AC11: Cambiar rol (`admin` | `organizer` | `customer`) actualiza BD y luego `publicMetadata.role`. Rechaza: cambiarse el rol a uno mismo, tocar a un `super_admin` y asignar `super_admin`. Reintentar tras un fallo de Clerk espeja el rol aunque la BD ya coincida.
- AC12: Suspender / reactivar actualiza `users.status` y luego Clerk `banUser` / `unbanUser`. Rechaza suspenderse a uno mismo o a un `super_admin`. Un usuario `suspended` no pasa `requirePermission` aunque su sesión siga vigente.
- AC13: Todas las Server Actions del panel llaman `requirePermission("users:manage-roles")` y validan la entrada con Zod antes de tocar BD o Clerk. Un usuario sin el permiso recibe error aunque su claim diga `super_admin`.
- AC14: `npm run db:seed -- --organizer <email>` existe (también acepta `SEED_ORGANIZER_EMAIL`). Falla con mensaje claro si no se pasa organizador, si no existe en `users`, si su rol no es `organizer` o si está `suspended`. Es idempotente: upsert de `categories` y `events` por `slug` y de `ticket_types` por `(event_id, name)`, sin duplicar al repetir. No pisa `status` ni `published_at` de eventos ya existentes. Se niega a correr con `NODE_ENV=production`. **El seed NO se ejecuta en esta tarea** ni en ninguna de sus fases: se verifica solo con el test del mapeo, `tsc` y `lint`.
- AC15: Mapeo del seed (D9–D12): 8 categorías de `EVENT_CATEGORIES` con `sort_order` por índice y slug sin acentos; 8 eventos publicados (los PEN); `ticket_types` una fila por zona de `buildEventVenue` (5 en `stadium`, 4 en `theater`) con `price_cents = precio × 100` y `max_per_order = MAX_TICKETS_PER_ZONE`. Slugs únicos y estables.
- AC16: `/login` redirige a `/sign-in`. Se eliminan `useSessionStore`, `AuthPage`, `AccountMenu` y `PasswordInput` (el header y el shell del organizador usan componentes de Clerk). `grep useSessionStore` no devuelve resultados.
- AC17: `system-design.md` §1–§2 queda actualizado (uso de `SUPER_ADMIN_EMAIL`, claims `metadata`, sync perezoso, panel, `/super-admin`).
- AC18: En cada fase pasan `npm run lint`, `npx tsc --noEmit` y `npm test`, y la app sigue funcionando.

## Contracts

### Entorno (`lib/env.ts`)
```ts
// agrega al schema existente
SUPER_ADMIN_EMAIL: z.preprocess((v) => (v === "" ? undefined : v), z.email().transform((e) => e.toLowerCase()).optional()),
```
`.env.example` agrega: `SUPER_ADMIN_EMAIL=`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up` (CLERK_* ya figuran). El seed lee su propio `SEED_ORGANIZER_EMAIL` o `--organizer` desde `process.env`/argv, no desde `env.ts`.

### Cliente BD
```ts
// db/index.ts
export const db: NodePgDatabase<typeof schema>; // import * as schema from "./schema"
```

### Roles y permisos (puros, seguros para el cliente)
```ts
// modules/auth/lib/permissions.ts
export const ROLES = ["super_admin", "admin", "organizer", "customer"] as const;
export type Role = (typeof ROLES)[number];
export type Permission =
  | "checkout:buy"          // customer, organizer, admin, super_admin (cualquier logueado)
  | "organizer:panel"       // organizer, admin, super_admin
  | "events:manage-own"     // organizer
  | "events:suspend"        // admin, super_admin
  | "users:suspend"         // admin, super_admin
  | "admin:panel"           // admin, super_admin
  | "users:manage-roles"    // super_admin (crear staff, cambiar rol, suspender desde el panel)
  | "super-admin:panel";    // super_admin
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]>;
export function can(role: Role, permission: Permission): boolean;
export function parseRole(value: unknown): Role; // ausente/inválido → "customer"
```
Nota: `users:manage-roles` es el único permiso que usa el panel. `events:suspend` y `users:suspend` quedan definidos para el panel admin futuro (A3), pero no se usan en esta spec. Si el reviewer ve que sobran, se quitan.

### Acceso a rutas (puro, sin imports de BD ni de Next)
```ts
// modules/auth/lib/route-access.ts
export type RouteAccess = "allow" | "sign-in" | "forbidden";
export const ROUTE_RULES: { prefix: string; roles: readonly Role[] | "any" }[];
// /checkout, /my-tickets → any ; /organizer → organizer|admin|super_admin ;
// /admin → admin|super_admin ; /super-admin → super_admin
export function resolveRouteAccess(pathname: string, session: { signedIn: boolean; role?: Role }): RouteAccess;
// sin sesión + ruta protegida → "sign-in"; rol presente e insuficiente → "forbidden"; rol ausente → "allow" (D6)
```

### Claims
```ts
// modules/auth/types/clerk-claims.d.ts
export {};
declare global { interface CustomJwtSessionClaims { metadata?: { role?: string } } }
```

### Perfil de Clerk y rol (puro)
```ts
// modules/auth/lib/clerk-profile.ts
export interface ClerkProfile { clerkUserId: string; email: string; fullName: string; metadataRole: Role | null }
// Adaptadores: webhook (snake_case) y Backend SDK User (camelCase). Ambos devuelven null si el email primario no está verificado.
export function profileFromWebhook(data: WebhookUserData): ClerkProfile | null;
export function profileFromClerkUser(user: User): ClerkProfile | null;
// fullName = "first last" recortado; si queda vacío, parte local del email. email en minúsculas.
export function resolveRole(p: { current: Role | null; email: string; superAdminEmail?: string }): Role;
// super_admin si email === superAdminEmail; si no, current ?? "customer". Nunca degrada. El email ya viene verificado.
export function needsRoleMirror(dbRole: Role, metadataRole: Role | null): boolean; // dbRole !== metadataRole
```

### Servicios de servidor (`modules/auth/server.ts`)
Entrada separada de `index.ts` para que ningún componente cliente arrastre `pg` ni `@clerk/backend`. Excepción documentada a SETUP §1 regla 6 (un módulo expone una API pública): `index.ts` = cliente y puro; `server.ts` = servidor.
```ts
export async function syncClerkUser(profile: ClerkProfile): Promise<UserRow>;     // upsert por clerk_user_id; aplica resolveRole; espeja a Clerk si needsRoleMirror
export async function suspendClerkUser(clerkUserId: string): Promise<void>;       // user.deleted → status suspended
export async function mirrorRoleToClerk(clerkUserId: string, role: Role): Promise<void>; // updateUserMetadata({ publicMetadata: { role } })
export const getCurrentUser: () => Promise<UserRow | null>;                       // React cache(); sync perezoso (D1)
export class AuthorizationError extends Error { code: "unauthenticated" | "suspended" | "forbidden" }
export async function requirePermission(permission: Permission): Promise<UserRow>; // para actions y route handlers
export async function requirePagePermission(permission: Permission): Promise<UserRow>; // para layouts y pages: redirect("/sign-in" | "/")
```
`UserRow = typeof users.$inferSelect`.

### Webhook
`app/api/webhooks/clerk/route.ts`: `export async function POST(req: NextRequest)`. Responde 200 al éxito (también a eventos ignorados), 400 por firma inválida, 500 por error de BD o Clerk.

### Módulo `modules/users`
```ts
// schemas/user-admin-schema.ts
export const createStaffSchema = z.object({ email: z.email().transform(lower), fullName: z.string().trim().min(2).max(120), role: z.enum(["admin", "organizer"]) });
export const changeRoleSchema = z.object({ userId: z.uuid(), role: z.enum(["admin", "organizer", "customer"]) });
export const setStatusSchema = z.object({ userId: z.uuid(), status: z.enum(["active", "suspended"]) });

// lib/role-change-rules.ts (puro)
export function checkRoleChange(actor: { id: string }, target: { id: string; role: Role }, next: Role): { ok: true } | { ok: false; reason: "self" | "target-super-admin" | "invalid-role" };
export function checkStatusChange(actor: { id: string }, target: { id: string; role: Role }): { ok: true } | { ok: false; reason: "self" | "target-super-admin" };

// actions/user-admin-actions.ts ("use server")
export type ActionResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };
export async function createStaffUserAction(input: unknown): Promise<ActionResult>;
export async function changeUserRoleAction(input: unknown): Promise<ActionResult>;
export async function setUserStatusAction(input: unknown): Promise<ActionResult>;

// services/user-admin-service.ts (servidor, sin directiva)
export async function listUsers(): Promise<UserRow[]>;
// createStaffUser, changeUserRole, setUserStatus: ver D4 y D5

// index.ts
export { UsersAdminPage } from "./components/users-admin-page";   // arma tabla + diálogo
```
Las acciones llaman `revalidatePath("/super-admin/users")`.

### Seed
```ts
// db/seed/mock-to-rows.ts (puro, testeable)
export const GENERAL_ADMISSION_CAPACITY = 1000;
export const slugify: (s: string) => string; // NFD sin acentos, kebab-case
export function buildSeedRows(organizerId: string): { categories: CategoryRow[]; events: (EventRow & { categorySlug: string })[]; ticketTypes: (TicketTypeRow & { eventSlug: string })[]; skipped: { id: string; reason: string }[] };
// db/seed/index.ts: CLI. parse args → validar organizador → transacción: upsert categories, events, ticket_types (resolviendo ids por slug) → log del resumen.
```
Script npm: `"db:seed": "tsx --env-file-if-exists=.env --env-file-if-exists=.env.local db/seed/index.ts"`. `tsx` va como devDependency explícita (hoy existe solo de forma transitiva).

## Edge cases
- Primer ingreso del super admin sin claim ni webhook → proxy deja pasar (D6), `requirePagePermission` hace el sync perezoso, lo promueve y espeja; los siguientes tokens traen el claim.
- Webhook y sync perezoso corren a la vez para el mismo usuario → upsert por `clerk_user_id` único, el segundo es no-op.
- La acción de cambio de rol dispara `user.updated` → el sync ve `metadataRole === role` y no vuelve a escribir (sin bucle).
- Usuario con varios emails en Clerk: se usa solo `primary_email_address_id`. Si es null o no está verificado, no se crea la fila y se responde 200.
- Email de una cuenta borrada y recreada en Clerk con otro `clerk_user_id`: choca con el único `users.email`. No se re-vincula automáticamente (riesgo de reactivar una suspensión): el sync registra el error y el webhook responde 500. Ver Open questions.
- `SUPER_ADMIN_EMAIL` cambia a otro email: el anterior conserva `super_admin` (no se degrada solo). Cambiarlo es tarea manual (SQL / otra acción futura).
- `createUser` falla porque el email ya existe en Clerk pero no en `users`: la acción devuelve error de campo con el mensaje de Clerk, sin fila huérfana.
- Fallo de `deleteUser` durante la compensación: se registra con `console.error` incluyendo el `clerkUserId` huérfano.
- Sesión vigente de un usuario suspendido: capa 2 lo bloquea; el proxy puede dejarlo pasar hasta que expire el token.
- Eventos del seed con `slug` ya existente de otro organizador → se actualizan los datos del evento (incluido `organizer_id`) pero no `status` ni `published_at`.
- `starts_at` ya pasado en el mock: se carga igual (`date` fijo del mockdata).
- Seed sin `--organizer` ni `SEED_ORGANIZER_EMAIL`: sale con código 1 y el mensaje de uso. Siempre cierra el `Pool`.
- Guests que hoy llegan a `/checkout` o `/my-tickets` pasan a ser redirigidos a `/sign-in` (cambio de comportamiento intencional, matriz §2).

## Tests
- `modules/auth/lib/clerk-profile.test.ts` — AC3, AC5:
  - payload de webhook con varios emails: elige el primario por `primary_email_address_id`;
  - email no verificado → `null`;
  - nombre: first+last, solo first, vacío → parte local del email;
  - email en minúsculas;
  - `resolveRole`: match con `superAdminEmail` (case-insensitive) → `super_admin`; sin env → `customer`; no degrada `admin` ni `super_admin`; no promueve si no hay match;
  - `needsRoleMirror`: `null` y distinto → `true`, igual → `false`.
- `modules/auth/lib/permissions.test.ts` — AC6: matriz completa rol × permiso (snapshot explícito), `parseRole` con `undefined`, `"foo"` y `"admin"`.
- `modules/auth/lib/route-access.test.ts` — AC7: tabla ruta × (sin sesión, customer, organizer, admin, super_admin, sin claim). Prefijo exacto (`/organizerx` no matchea), rutas públicas y `/api/webhooks/clerk` → `allow`.
- `modules/users/lib/role-change-rules.test.ts` — AC11, AC12: self, target `super_admin`, rol `super_admin` inválido, caso feliz.
- `modules/users/schemas/user-admin-schema.test.ts` — AC10, AC13: email inválido, nombre corto, rol `super_admin` rechazado en `createStaffSchema`, `userId` no uuid.
- `db/seed/mock-to-rows.test.ts` — AC14, AC15: 8 categorías con sort_order y slugs sin acentos; 8 eventos y 2 omitidos con razón (`evt-006` EUR, `evt-007` USD); slugs únicos; `starts_at` de `evt-001` = `2026-11-14T21:00:00-05:00`; precios en céntimos de Bad Bunny (690/450/380/320/250 × 100); `evt-001` stadium con 5 zonas y `evt-004` theater con 4; zona `sold-out` → capacity 0 (`evt-003`); capacidad de zona general = 1000 y de numerada = cantidad de asientos; salida determinista (dos llamadas iguales).
- Sin tests de BD ni de Clerk (requieren mocks de todo el SDK: poco valor). Se cubre AC3, AC4, AC8, AC10–AC14 (flujo) con la lógica pura de arriba más revisión del reviewer. Verificación manual con la instancia dev: ver pasos H1–H3.

## Plan

### Phase 1 — Cliente BD, env y sync Clerk → users (+ super admin)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: `SUPER_ADMIN_EMAIL` en env, vars en `.env.example`, cliente Drizzle | lib/env.ts, .env.example, db/index.ts | - | A | AC1, AC2 | done |
| T2 | Lógica pura de perfil de Clerk y rol, con tests | modules/auth/lib/clerk-profile.ts, modules/auth/lib/clerk-profile.test.ts | - | A | AC3, AC5 | done |
| T3 | Servicios de servidor: `syncClerkUser`, `suspendClerkUser`, `mirrorRoleToClerk`, `getCurrentUser` (sync perezoso) y entrada `server.ts` | modules/auth/services/user-sync.ts, modules/auth/services/current-user.ts, modules/auth/server.ts | T1, T2 | B | AC3, AC4, AC5 | done |
| T4 | Webhook `POST /api/webhooks/clerk` | app/api/webhooks/clerk/route.ts | T3 | C | AC3 | done |

### Phase 2 — Roles, permisos y protección de rutas
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | Mapa de permisos, `can`, `parseRole`, con tests | modules/auth/lib/permissions.ts, modules/auth/lib/permissions.test.ts | - | A | AC6 | done |
| T2 | Reglas de acceso por ruta, con tests | modules/auth/lib/route-access.ts, modules/auth/lib/route-access.test.ts | - | A | AC7 | done |
| T3 | `AuthorizationError`, `requirePermission`, `requirePagePermission` | modules/auth/services/authorization.ts | T1 | B | AC8 | done |
| T4 | `proxy.ts` con matriz y tipo de claims | proxy.ts, modules/auth/types/clerk-claims.d.ts | T2 | B | AC7 | done |
| T5 | Exports del módulo (puro en `index.ts`, servidor en `server.ts`) y guard en layout de organizador | modules/auth/index.ts, modules/auth/server.ts, app/organizer/layout.tsx | T3, T4 | C | AC8 | done |

Nota T5: `modules/auth/index.ts` mantiene temporalmente los exports de la sesión mock (se retiran en Fase 6) y agrega los de `lib/permissions` y `lib/route-access`.

### Phase 3 — Dominio de gestión de usuarios (sin UI)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | Schemas Zod y reglas puras de cambio, con tests | modules/users/schemas/user-admin-schema.ts, modules/users/schemas/user-admin-schema.test.ts, modules/users/lib/role-change-rules.ts, modules/users/lib/role-change-rules.test.ts | - | A | AC10–AC13 | done |
| T2 | Servicio: `listUsers`, `createStaffUser` (con compensación), `changeUserRole`, `setUserStatus` | modules/users/services/user-admin-service.ts | T1 | B | AC10–AC12 | done |
| T3 | Server Actions con `requirePermission` + Zod + `revalidatePath` | modules/users/actions/user-admin-actions.ts | T2 | C | AC13 | done |

### Phase 4 — Panel `/super-admin/users`
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: `npx shadcn@latest add table dialog` | components/ui/table.tsx, components/ui/dialog.tsx | - | A | AC9 | done |
| T2 | Tabla de usuarios (rol con `Select`, botón suspender/reactivar, errores de acción) | modules/users/components/users-table.tsx | T1 | B | AC9, AC11, AC12 | done |
| T3 | Diálogo "Crear usuario" (email, nombre, rol) | modules/users/components/create-staff-dialog.tsx | T1 | B | AC10 | done |
| T4 | Composición del panel, export del módulo y página delgada | modules/users/components/users-admin-page.tsx, modules/users/index.ts, app/super-admin/users/page.tsx | T2, T3 | C | AC9 | done |

Nota: sin link en el header (Out). Se entra por URL. Fase 4 verifica a mano con H1–H3 hechos.

### Phase 5 — Seed de eventos (no se ejecuta)
Independiente de las fases 2–4 (solo necesita `db/index.ts` de la Fase 1). Puede correr en paralelo.
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: `tsx` como devDependency y script `db:seed` | package.json, package-lock.json | - | A | AC14 | done |
| T2 | Mapeo mockdata → filas, con tests | db/seed/mock-to-rows.ts, db/seed/mock-to-rows.test.ts | - | A | AC15 | done |
| T3 | CLI del seed (args, validación del organizador, upserts en transacción, rechazo en producción). **No se ejecuta.** | db/seed/index.ts | T1, T2 | B | AC14 | done |

### Phase 6 — Retiro de la sesión mock y docs
Depende de las fases 1–2 (proxy + Clerk como único login).
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | Quitar `AccountMenu` y la sesión mock del header y de los stores persistidos; `/login` → redirect a `/sign-in` | components/shared/site-header.tsx, components/shared/persisted-stores.tsx, app/login/page.tsx | - | A | AC16 | done |
| T2 | `OrganizerShell`: nombre y cierre de sesión con Clerk (`useUser`, `SignOutButton` o `UserButton`) en lugar del store | modules/organizer/components/organizer-shell.tsx | - | A | AC16 | done |
| T3 | Borrar `modules/auth` legacy (`auth-page`, `account-menu`, `password-input`, `use-session-store`, `display-name` y su test) y sus exports | modules/auth/components/auth-page.tsx, modules/auth/components/account-menu.tsx, modules/auth/components/password-input.tsx, modules/auth/store/use-session-store.ts, modules/auth/lib/display-name.ts, modules/auth/lib/display-name.test.ts, modules/auth/index.ts | T1, T2 | B | AC16 | done |
| T4 | Actualizar `system-design.md` (§1 tabla de env vars, §2: A2, claims, sync perezoso, panel) | docs/architecture/system-design.md | - | A | AC17 | done |

## Open questions
Ninguna bloquea el diseño: todo tiene un default propuesto (D1–D12). Pedir confirmación puntual de:
- Q1 (D3) Cambiar A2: super admin por email en el sync, no por seed. ¿OK?
- Q2 (Out/AC7) `/checkout` y `/my-tickets` pasan a exigir sesión ya en esta spec; hoy se pueden abrir como invitado. ¿OK o se deja para cuando se conecte el pago?
- Q3 (D4) Usuarios creados desde el panel quedan sin contraseña y entran con Google o "Olvidé mi contraseña". Se asume que `createUser` de la Backend API deja el email verificado: confirmar al implementar. Si no, se pasa a invitación y se pierde el rol inmediato.
- Q4 (D10) El seed omite `evt-006` (EUR) y `evt-007` (USD). ¿Se prefiere cargarlos igual (precios mal rotulados como S/) o agregar `currency` al modelo?
- Q5 (D11) Capacidad por defecto 1000 en zonas generales y `capacity 0` para zonas agotadas del mock.
- Q6 (Edge) Cuenta recreada en Clerk con un email ya usado en `users`: ¿re-vincular automáticamente o resolver a mano?
- Q7 (Fase 6) Retirar la sesión mock en esta misma spec. ¿O se deja convivir hasta que haya más UI con Clerk?
- Contradicción con docs (resuelta en Fase 6 T4): system-design §1 dice que `SUPER_ADMIN_EMAIL` "solo lo lee el script de seed" y A2 habla de un seed de usuarios. Esta spec lo cambia por el sync.
