# Dashboard del organizador con datos reales y hook `useEvents`

- Module: organizer
- Status: done
- Approved by: lenadro291 (2026-10-05, respuesta "Aprobar y ejecutar")
- Mode: SDD

## Goal
`/organizer` deja de leer el store local y muestra eventos publicados, entradas vendidas e ingresos reales de la BD. El listado de eventos se resuelve con un hook reutilizable `useEvents(scope)` (TanStack Query) respaldado por `GET /api/events` con autorización por rol en el servidor, listo para reusarse en el panel de admin y, más adelante, en el catálogo público.

## Scope
- In:
  - Permisos `events:read-own` y `events:read-all` en `ROLE_PERMISSIONS`.
  - `GET /api/events?scope=mine|all|published`: validación Zod, autorización contra la BD, una sola consulta agregada.
  - Hook `useEvents` + cableado mínimo de `QueryClientProvider` en el layout raíz.
  - Métricas reales (publicados, entradas vendidas, ingresos en PEN, capacidad por evento y por tipo de entrada), con lógica pura testeada.
  - `OrganizerDashboard` y `EventSalesSheet` consumen los datos reales, con estados de carga, error con reintento y vacío.
  - Limpieza de lo que queda muerto (datos mock del organizador, `getEventStats` por tiers del store).
- Out:
  - Migrar el catálogo público (home, detalle, checkout): sigue en mock. El alcance `published` queda soportado y documentado, **sin cablearlo al home**.
  - Escritura: "Crear evento" sigue guardando en localStorage (zustand). No hay spec de escritura todavía.
  - Panel `/admin` y su UI (el alcance `all` queda listo, sin consumidor).
  - Paginación, búsqueda y filtro por estado en servidor (el filtro Todos/Publicados/Borradores sigue en el cliente sobre la lista ya cargada).
  - Disponibilidad pública ("Agotado", "Últimas entradas"): necesita ventas públicas, va con la migración del catálogo.
  - Órdenes de prueba (no hay checkout ni seed de órdenes): las ventas reales solo se ven cuando exista el flujo de compra.
  - Prefetch SSR con `HydrationBoundary`.

## Decisiones (propuestas, el usuario valida)
| #  | Decisión |
| -- | -------- |
| D1 | **Route Handler `GET /api/events`, no Server Action.** Los Server Actions son para mutaciones y el cliente los despacha de a uno (`node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`); una lectura cacheable por TanStack Query encaja con un `GET`. El layout ya protege la página y `proxy.ts` deja pasar `/api/events` (no está en `ROUTE_RULES`), así que **el handler es la única barrera de ese endpoint** y llama `requirePermission` él mismo. |
| D2 | **El servidor decide el alcance; el cliente solo pide una vista.** `scope` es una *solicitud* que el servidor autoriza con un permiso. El `organizer_id` sale siempre de `requirePermission` (la fila de la BD), nunca de la query: `organizerId` u otros parámetros se ignoran. Pedir un alcance sin permiso → 403, nunca se degrada en silencio a otro. `mine` filtra por el usuario de la sesión **también para admin/super_admin** (un admin en `/organizer` ve sus propios eventos, normalmente ninguno); `all` es de admin/super_admin y lo usará `/admin`. |
| D3 | **Permisos nuevos** `events:read-own` (organizer, admin, super_admin) y `events:read-all` (admin, super_admin) en vez de reutilizar `organizer:panel` / `admin:panel`: los permisos de panel gobiernan *acceso a una zona de UI*; leer ventas de otros organizadores es una capacidad de datos distinta y no debe cambiar si se reorganizan los paneles. Costo: 2 strings y 2 filas en el test de la matriz. `published` no pide permiso (es público). |
| D4 | **Una consulta por request**, una fila por (evento × tipo de entrada), agregada en SQL y plegada a eventos en TypeScript por una función pura. Sirve a la vez para KPIs, lista y el desglose por tipo de entrada del sheet "Ver ventas". `LEFT JOIN` ticket_types → order_items → orders, con `SUM(...) FILTER (WHERE orders.status = 'paid')`: eventos sin tipos de entrada o sin ventas aparecen con 0. El alcance `published` **no toca `order_items` ni `orders`** (no calcula ventas). |
| D5 | **Métricas** (todas sobre eventos del alcance, sin importar el estado del evento): `entradas vendidas` = `SUM(order_items.quantity)` de órdenes `paid`; `ingresos` = `SUM(quantity * unit_price_cents)` de órdenes `paid`, en céntimos de PEN; `capacidad` = `SUM(ticket_types.capacity)`; `eventos publicados` = eventos con `status = 'published'`. Las órdenes `pending`, `expired` y `refunded` aportan 0. El modelo no tiene reembolsos parciales (`refunded` es la orden entera), así que "neto de reembolsos" se cumple con solo contar `paid`. El producto se castea a `bigint` en SQL (`quantity::bigint * unit_price_cents`) porque `int4 * int4` desborda desde ~21 M de soles. |
| D6 | **Dinero en céntimos hasta la UI.** Se muestra con `formatPriceCents(cents) = formatPrice(cents / 100)` (nuevo, en `modules/event/lib/format.ts`). `formatPrice` redondea a soles enteros (`maximumFractionDigits: 0`): un precio con céntimos se ve redondeado. Aceptado: hoy los precios del seed son soles enteros y es el diseño vigente. |
| D7 | **Fecha en hora de Lima.** `starts_at` viaja en ISO (UTC). La UI usa `isoToLimaDate(iso)` → `yyyy-mm-dd` con `timeZone: "America/Lima"` (el modelo es solo Perú/PEN, sin DST) y luego `formatDateShort`. Evita que un evento a las 21:00 Lima se muestre al día siguiente. |
| D8 | **Borradores locales: el dashboard deja de listarlos.** Mezclar BD y localStorage duplicaría fuentes y haría que KPIs y lista dejen de salir del mismo dato. Consecuencias aceptadas y documentadas (hueco conocido hasta la spec de escritura): (a) lo que se crea en el formulario **no aparece** en el dashboard; (b) el flujo `/organizer/events/new?draft=<id>` queda huérfano (ya no hay link que lo abra); (c) los eventos de la BD en estado `draft` no tienen acción "Editar" (no hay edición de eventos de BD): la celda de acción queda vacía. El CTA "Crear evento" y el formulario **no se tocan**. |
| D9 | **Aviso `?saved=` honesto.** Hoy dice "Tu evento se publicó." pero el evento no aparecerá en el resumen. Se cambia el copy a: published → "Guardamos tu evento en este navegador. Todavía no aparece en el resumen."; draft → "Guardamos tu borrador en este navegador." (solo texto del dashboard; el formulario sigue redirigiendo igual). |
| D10 | **"Ver página del evento" se quita del sheet.** Enlazaba a `/events/<catalogId>` (id del mock). El detalle público sigue en mock y el `slug` de la BD no resuelve ahí. Vuelve con la migración del catálogo. |
| D11 | **Estados `cancelled` y `suspended`** existen en el enum y pueden venir de la BD: se agregan sus badges ("Cancelado", "Suspendido") y solo se ven bajo "Todos". Los filtros Publicados/Borradores no cambian. Sus ventas `paid` cuentan en entradas e ingresos (hasta que se reembolsen y la orden pase a `refunded`). |
| D12 | **Aislamiento de caché por usuario.** La caché de React Query vive en memoria de la pestaña; sin más, un segundo usuario en la misma pestaña (cerrar sesión + iniciar otra sin recarga) vería datos del anterior durante `staleTime`. La key incluye el `userId` de Clerk para los alcances privados. Es solo clave de caché: el servidor lo ignora. |
| D13 | **Server/cliente como en `modules/auth`:** `modules/event/index.ts` queda client-safe (tipos, hook, formateadores); `modules/event/server.ts` exporta el servicio con `db`. Ningún archivo cliente importa `@/modules/event/server`. |

## Reuse
Reference: system-design §2 (Autorización en dos capas, Matriz de acceso, Permisos), mer.md `events`, `ticket_types`, `orders`, `order_items` y "Reglas de negocio derivadas del modelo" (KPIs del dashboard son consultas, sin tablas de resumen), `specs/platform/clerk-db-roles-and-seed.md` (D2, D6, `requirePermission`).
- Reuse: `modules/auth/server` (`requirePermission`, `AuthorizationError`) — capa 2 del endpoint; ya bloquea `suspended` y decide por la BD.
- Reuse: `db`, `db/schema/{events,orders}` — sin migraciones; los índices `events.organizer_id`, `order_items.ticket_type_id` y `order_items.order_id` ya existen.
- Reuse: `modules/organizer/components/sold-bar.tsx` (sin cambios: recibe `sold` y `capacity` numéricos), `components/ui/sheet`, `formatDateShort`, `formatPrice`, `filterEventsByStatus` (se reescribe sobre el tipo nuevo).
- Reuse: `@tanstack/react-query`, `zod`, `@clerk/nextjs` (`useAuth`), `vitest`. **Sin dependencias nuevas.**
- Reuse: patrón de `components/shared/persisted-stores.tsx` (provider cliente montado en `app/layout.tsx` dentro de `ClerkProvider`) y patrón `index.ts` / `server.ts` de `modules/auth`. Patrón de `modules/users/components/users-admin-page.tsx` (seleccionar columnas, no serializar `clerkUserId`).
- Descartado: Server Action de lectura (D1); axios (no existe `lib/api`; `fetch` nativo alcanza); tabla o vista de resumen (mer.md lo descarta).
- Extend: `modules/auth/lib/permissions.ts` (+test) — 2 permisos.
- Extend: `app/layout.tsx` — monta `QueryProvider`.
- Extend: `modules/event/index.ts` — exporta hook, tipos, `formatPriceCents`, `isoToLimaDate`.
- Extend: `modules/event/lib/format.ts` (+test) — `formatPriceCents`, `isoToLimaDate`.
- Replace: `modules/organizer/lib/event-stats.ts` (+test) — de tiers del store (`OrganizerEvent`) a `ManagedEventItem`: se conservan `filterEventsByStatus` y `getOrganizerKpis`; `getEventStats` se reemplaza por `soldPercent`.
- Replace: `modules/organizer/components/organizer-dashboard.tsx` y `event-sales-sheet.tsx` — fuente de datos nueva.
- Extend: `modules/organizer/store/use-organizer-store.ts` — estado inicial `events: []` (sin mock); el formulario sigue usándolo igual.
- Extend: `modules/organizer/lib/event-draft.test.ts` — fixture inline en lugar de `ORGANIZER_EVENTS`.
- Delete: `modules/organizer/data/organizer-events.ts` — tras el cambio solo lo usarían tests y el estado inicial del store; sería código muerto.
- Se conservan, porque los usa el formulario: `modules/organizer/types/organizer-event.ts` (`OrganizerEvent`, `TierDraft`, `EventDraft`, `TicketTier`), `store/use-organizer-store.ts`, `lib/event-draft.ts`, `components/event-form*`, y los exports de `modules/organizer/index.ts`. `SavedNotice` / `OrganizerEventStatus` siguen vigentes.
- New: `modules/event/{types/event-list.ts, schemas/event-list-schema.ts, lib/event-scope.ts, lib/event-list.ts, services/event-list-service.ts, services/event-list-client.ts, hooks/use-events.ts, server.ts}`, `app/api/events/route.ts`, `components/shared/query-provider.tsx`, `modules/organizer/components/dashboard-states.tsx`, `components/ui/skeleton.tsx` (shadcn `add skeleton`, antes de escribir uno propio). Nada equivalente existe: `event-service.ts` es el catálogo mock (ids `evt-xxx`, `EventSummary` con `priceFrom`, sin BD ni ventas) y no se mezcla con esto.
- Dónde vive qué (SETUP §1): hook, servicio, tipos y endpoint son dominio evento reutilizable → `modules/event`. KPIs del organizador, filtro por estado y UI → `modules/organizer`. `app/api/events/route.ts` es solo routing delgado.

## Acceptance criteria
Seguridad y alcance
- AC1: `Permission` suma `events:read-own` (organizer, admin, super_admin) y `events:read-all` (admin, super_admin); `customer` no tiene ninguno. La matriz completa rol × permiso sigue cubierta por test.
- AC2: `GET /api/events` valida la query con Zod: `scope` obligatorio en {`mine`, `all`, `published`}. Ausente o inválido → 400 `{ error: "invalid-query" }`. Parámetros extra (por ejemplo `organizerId`) se descartan y nunca se leen.
- AC3: `mine` exige `events:read-own`, `all` exige `events:read-all`, `published` no exige permiso. Los privados llaman `requirePermission` (BD, ignora claims). Sin sesión → 401 `unauthenticated`; usuario `suspended` → 403 `suspended`; sin permiso (customer en `mine`; organizer en `all`) → 403 `forbidden`. Un rol nunca recibe un alcance distinto del pedido.
- AC4: En `mine` la consulta filtra `events.organizer_id = <id del usuario de la sesión>`, sea cual sea su rol; en `all` no filtra por organizador; en `published` filtra `status = 'published'`. El id del organizador entra al servicio solo como argumento interno que arma el route handler desde `requirePermission`.
- AC5: El alcance `published` devuelve ítems **sin** campo `sales` y su consulta no une `order_items` ni `orders`. Ningún alcance devuelve `clerkUserId`, `organizerId`, email, códigos de orden ni datos de compradores: el conjunto de claves de cada ítem es exactamente el del contrato (test).
- AC6: Las respuestas de `mine`/`all` llevan `Cache-Control: private, no-store`. Error de BD → 500 `{ error: "internal" }` (el detalle solo va a `console.error`).

Métricas
- AC7: Por evento: `sold` = suma de `order_items.quantity` de órdenes `paid`; `revenueCents` = suma de `quantity * unit_price_cents` de órdenes `paid`; `capacity` = suma de `ticket_types.capacity`. Órdenes `pending`, `expired` y `refunded` no suman.
- AC8: Un evento sin ventas o sin tipos de entrada aparece con `sold = 0`, `revenueCents = 0` y `tiers` vacío si no tiene tipos (capacidad 0); `priceFromCents` es `null` sin tipos de entrada, si no el mínimo.
- AC9: La BD se consulta una sola vez por request (sin N+1) y los montos son enteros en céntimos; sumas por encima de `int4` son correctas (cast a `bigint` en SQL, parseo de string en TS) y un valor fuera de `Number.isSafeInteger` lanza error en vez de mostrar un número impreciso.
- AC10: Los KPIs del dashboard (publicados, entradas, ingresos) se calculan con `getOrganizerKpis` sobre **la misma lista** que renderiza las filas, independientemente del filtro de estado activo. Con 0 eventos o 0 ventas: `0`, `0` y `S/ 0`.
- AC11: `formatPriceCents` y `isoToLimaDate` están cubiertos: `isoToLimaDate("2026-11-15T02:00:00Z") === "2026-11-14"`.

Hook y provider
- AC12: `QueryProvider` (cliente) crea un `QueryClient` por montaje con `useState` (no singleton de módulo, para no compartir caché entre requests en SSR), `staleTime` 30 s y `retry` 1, y se monta en `app/layout.tsx` dentro de `ClerkProvider`. Las páginas siguen siendo Server Components y no hay desajuste de hidratación (en servidor `useEvents` no fetchea y el primer render es el esqueleto).
- AC13: `useEvents(scope)` devuelve `ManagedEventItem[]` para `mine`/`all` y `EventListItem[]` para `published` (tipado por el argumento). Query key `["events", scope, owner]` con `owner` = `userId` de Clerk en privados y `"public"` en `published`. En privados queda deshabilitado hasta que Clerk cargó y hay `userId`. Errores 400/401/403 no se reintentan; el resto sí, hasta el `retry` del provider.

UI
- AC14: `OrganizerDashboard` obtiene los datos con `useEvents("mine")` y ya no lee `useOrganizerStore`. Se mantiene el diseño actual (KPIs, tabla, tarjetas móviles, filtro, sheet).
- AC15: Estados: **cargando** → esqueleto de KPIs y filas, `aria-busy`; **error** → mensaje y botón "Reintentar" (`refetch`); si el error es 401/403 el mensaje es "No tienes acceso a estos datos" sin botón de reintento; **vacío sin eventos** → "Todavía no tienes eventos en la base de datos." con KPIs en 0; **filtro sin resultados** → el texto actual "No tienes eventos en este estado.".
- AC16: Cada fila muestra título, fecha (Lima) y ciudad, badge de estado (4 estados), `vendidas / capacidad` con `SoldBar`, e ingresos de `revenueCents`. Eventos `draft` de BD sin acción; el resto con "Ver ventas". El sheet lista por tipo de entrada nombre, precio, `vendidas / capacidad`, barra e ingresos, con totales (ingresos y % vendido, máx. 100) y sin "Ver página del evento" (D10).
- AC17: El dashboard no lista borradores/eventos del store local; el aviso `?saved=` usa el copy de D9. "Crear evento" y el formulario no cambian de comportamiento.
- AC18: No queda código muerto: sin `ORGANIZER_EVENTS`, sin `getEventStats` por tiers, sin `getOrganizerKpis`/`filterEventsByStatus` sobre `OrganizerEvent`; `grep -rn "ORGANIZER_EVENTS" .` sin resultados fuera de specs/docs.
- AC19: Ningún archivo cliente importa `@/modules/event/server` ni `pg`; `modules/event/index.ts` no re-exporta el servicio de BD.
- AC20: En cada fase pasan `npm run lint`, `npx tsc --noEmit` y `npm test`, y la app sigue funcionando.
- AC21: `docs/architecture/system-design.md` documenta `GET /api/events` (alcances, permisos, respuesta) y `mer.md` las definiciones de las métricas del dashboard.

## Contracts

### Permisos (`modules/auth/lib/permissions.ts`)
```ts
export type Permission = /* …existentes… */ | "events:read-own" | "events:read-all";
// organizer:   + "events:read-own"
// admin:       + "events:read-own", "events:read-all"
// super_admin: + "events:read-own", "events:read-all"
// customer:    sin cambios
```

### Tipos (`modules/event/types/event-list.ts`, client-safe)
```ts
export const EVENT_LIST_SCOPES = ["mine", "all", "published"] as const;
export type EventListScope = (typeof EVENT_LIST_SCOPES)[number];
export type EventDbStatus = "draft" | "published" | "cancelled" | "suspended";

/** Alcance público: sin ventas. */
export interface EventListItem {
  id: string;            // uuid de events.id
  slug: string;
  title: string;
  categoryName: string;
  coverImageUrl: string | null;
  startsAt: string;      // ISO 8601
  venueName: string;
  city: string;
  status: EventDbStatus;
  priceFromCents: number | null; // mínimo de ticket_types.price_cents; null sin tipos
}

export interface TierSales {
  id: string; name: string; priceCents: number; capacity: number; sold: number; revenueCents: number;
}

/** Alcances privados (`mine`, `all`). */
export interface ManagedEventItem extends EventListItem {
  sales: { sold: number; capacity: number; revenueCents: number; tiers: TierSales[] }; // tiers por sort_order
}

export type EventItemFor<S extends EventListScope> = S extends "published" ? EventListItem : ManagedEventItem;
export type EventListResponse<S extends EventListScope = EventListScope> = { items: EventItemFor<S>[] };
export type EventListErrorCode = "invalid-query" | "unauthenticated" | "suspended" | "forbidden" | "internal";
```
Los ítems no incluyen `organizerId` ni ningún dato de usuario.

### Schema y scope (`modules/event/schemas/event-list-schema.ts`, `modules/event/lib/event-scope.ts`, puros)
```ts
export const eventListQuerySchema = z.object({ scope: z.enum(EVENT_LIST_SCOPES) }); // strip por defecto: organizerId se descarta

// event-scope.ts
export function permissionForScope(scope: EventListScope): Permission | null;
//   mine → "events:read-own"; all → "events:read-all"; published → null
export function statusForAuthError(code: AuthorizationErrorCode): 401 | 403; // unauthenticated → 401; suspended/forbidden → 403
```
`AuthorizationErrorCode` se importa como tipo de `@/modules/auth/server` (solo tipo: no arrastra BD al bundle).

### Constructor puro (`modules/event/lib/event-list.ts`)
```ts
/** Una fila por (evento × tipo de entrada). Columnas tier* null si el evento no tiene tipos. */
export interface EventListRow {
  id: string; slug: string; title: string; categoryName: string; coverImageUrl: string | null;
  startsAt: Date; venueName: string; city: string; status: EventDbStatus;
  tierId: string | null; tierName: string | null; tierPriceCents: number | null;
  tierCapacity: number | null; tierSortOrder: number | null;
  tierSold?: string | number | null;         // pg devuelve bigint/numeric como string; ausente en `published`
  tierRevenueCents?: string | number | null; // idem
}
export function buildEventList(rows: EventListRow[], opts: { includeSales: true }): ManagedEventItem[];
export function buildEventList(rows: EventListRow[], opts: { includeSales: false }): EventListItem[];
// Conserva el orden de primera aparición de cada evento. Pliega filas por evento; tiers por sortOrder;
// sold/capacity/revenueCents = sumas de tiers; startsAt → toISOString().
// includeSales:false no emite la clave `sales`. parse de montos: Number(); si !Number.isSafeInteger → throw.
```

### Servicio de servidor (`modules/event/services/event-list-service.ts`, exportado por `modules/event/server.ts`)
```ts
export type EventListQuery =
  | { scope: "published" }
  | { scope: "all" }
  | { scope: "mine"; organizerId: string }; // organizerId SOLO lo pasa el route handler desde requirePermission

export async function listEvents(query: { scope: "published" }): Promise<EventListResponse<"published">>;
export async function listEvents(query: { scope: "all" } | { scope: "mine"; organizerId: string }): Promise<EventListResponse<"mine">>;
```
Consulta (descripción, no código a copiar): `events` INNER JOIN `categories`, LEFT JOIN `ticket_types`; en alcances privados además LEFT JOIN `order_items` y `orders`, con `COALESCE(SUM(oi.quantity) FILTER (WHERE o.status = 'paid'), 0)` y `COALESCE(SUM(oi.quantity::bigint * oi.unit_price_cents) FILTER (WHERE o.status = 'paid'), 0)::bigint`, `GROUP BY events.id, categories.id, ticket_types.id`. `WHERE` según alcance (AC4). `ORDER BY events.starts_at DESC, events.id` y luego `ticket_types.sort_order`. Selecciona solo las columnas de `EventListRow`.
`// ponytail: agrega en cada request sobre todas las órdenes de los eventos del alcance, sin paginar. Techo ~500 eventos por alcance y ~100k order_items por organizador; después paginar en servidor y mover KPIs a una consulta aparte o a contadores.`

### Route handler (`app/api/events/route.ts`, delgado)
```ts
export async function GET(req: NextRequest): Promise<Response>;
// 1. eventListQuerySchema.safeParse({ scope: req.nextUrl.searchParams.get("scope") }) → 400 invalid-query
// 2. permission = permissionForScope(scope); si hay: user = await requirePermission(permission)
//    AuthorizationError → { error: code } con statusForAuthError(code)
// 3. listEvents(scope === "mine" ? { scope, organizerId: user.id } : { scope })
// 4. 200 { items } (+ Cache-Control: private, no-store si el alcance es privado); cualquier otro error → 500 { error: "internal" }
```

### Cliente (`modules/event/services/event-list-client.ts`, `modules/event/hooks/use-events.ts`)
```ts
export class EventListError extends Error { status: number; code: EventListErrorCode }
export async function fetchEvents<S extends EventListScope>(scope: S, signal?: AbortSignal): Promise<EventItemFor<S>[]>;
// fetch(`/api/events?scope=${scope}`, { signal }); !ok → throw EventListError(status, body.error ?? "internal")
export function shouldRetryEvents(failureCount: number, error: unknown): boolean;
// false si error es EventListError con status 400|401|403; si no, failureCount < 1

"use client";
export function useEvents<S extends EventListScope>(scope: S): UseQueryResult<EventItemFor<S>[], EventListError>;
```

### Provider (`components/shared/query-provider.tsx`)
```tsx
"use client";
export function QueryProvider({ children }: { children: React.ReactNode }); // useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 1 } } }))
```
Se monta en `app/layout.tsx`: `<ClerkProvider><QueryProvider><PersistedStores />{children}</QueryProvider></ClerkProvider>`.

### Formato (`modules/event/lib/format.ts`)
```ts
export function formatPriceCents(cents: number): string; // formatPrice(cents / 100)
export function isoToLimaDate(iso: string): string;      // "yyyy-mm-dd" en America/Lima
```

### Métricas del organizador (`modules/organizer/lib/event-stats.ts`, puro)
```ts
export type EventStatusFilter = "all" | "published" | "draft";
export function soldPercent(sold: number, capacity: number): number; // entero 0–100; capacity 0 → 0; tope 100
export function getOrganizerKpis(events: ManagedEventItem[]): { sold: number; revenueCents: number; published: number };
export function filterEventsByStatus(events: ManagedEventItem[], filter: EventStatusFilter): ManagedEventItem[];
```

### Componentes
- `EventSalesSheet({ event, triggerClassName }: { event: ManagedEventItem; triggerClassName: string })`.
- `OrganizerDashboard({ saved }: { saved?: SavedNotice })` (firma pública sin cambios; `app/organizer/page.tsx` no se toca).
- `dashboard-states.tsx` exporta `DashboardSkeleton` y `DashboardError({ forbidden, onRetry })` (presentacionales).
- Imagen de portada: `unoptimized` cuando la URL no empieza con `/` (data URLs y remotas, sin tocar `next.config`).

## Edge cases
- Sin sesión → 401; la página `/organizer` ya redirige antes, pero el endpoint se defiende solo. Un `fetch` desde otra pestaña sin cookie recibe 401 y la UI muestra el estado de acceso denegado.
- Rol insuficiente: `customer` pide `mine` → 403; `organizer` pide `all` → 403; ambos sin filtrarse a otro alcance.
- Usuario `suspended` con sesión vigente → 403 `suspended` (lo decide `requirePermission` desde la BD, el claim del proxy no cuenta).
- Scope manipulado: `?scope=all` de un organizer, `?scope=ALL`, `?scope=`, sin `scope`, `?scope=mine&scope=all` (se lee solo el primero con `searchParams.get`), `?organizerId=<otro uuid>` ignorado.
- Evento ajeno por id: el endpoint no acepta ids; `mine` filtra por el organizador de la sesión, así que no hay forma de pedir un evento de otro.
- Organizador sin eventos → `items: []` → estado vacío, KPIs en 0.
- Evento sin tipos de entrada → capacidad 0, `tiers: []`, `priceFromCents: null`, 0% vendido; la fila se renderiza igual; el sheet muestra "Este evento no tiene tipos de entrada.".
- Órdenes `refunded`, `expired`, `pending` → no suman (solo `paid`).
- Tipo de entrada con `capacity 0` (zona agotada del seed) → 0% sin dividir por cero.
- `sold > capacity` (capacidad bajada después de vender, system-design Casos borde) → `soldPercent` y `SoldBar` topan en 100 %.
- Montos grandes: sumas > 2^31 céntimos devueltas por `pg` como string; se parsean; fuera de rango seguro → error 500 (nunca se muestra un valor inexacto).
- Evento a las 21:00 Lima = 02:00 UTC del día siguiente → `isoToLimaDate` devuelve el día de Lima.
- SSR: `useEvents` no ejecuta `queryFn` en el servidor; HTML y primer render del cliente son el esqueleto. `QueryClient` por instancia, no global.
- Cambio de usuario en la misma pestaña: key con `userId` → no reusa la caché del anterior (D12).
- Evento `cancelled`/`suspended` con ventas `paid`: sus ventas suman hasta el reembolso (D11).
- Datos locales viejos: usuarios con eventos en `localStorage` siguen en el store (no se migran ni se borran) y el formulario puede editarlos por URL; el dashboard no los muestra (D8).
- Error de red / 5xx → estado de error con "Reintentar"; tras 1 reintento automático.

## Tests
Sin tests de BD ni de componentes (SETUP: no se testea markup). El SQL se verifica por lectura del reviewer (`FILTER (WHERE o.status = 'paid')`, ausencia de `orders` en `published`, filtro `organizer_id`) y por la verificación manual de abajo.
- `modules/auth/lib/permissions.test.ts` — AC1: `ALL` y `EXPECTED` suman los 2 permisos; matriz rol × permiso completa.
- `modules/event/schemas/event-list-schema.test.ts` — AC2: acepta los 3 scopes; rechaza ausente, vacío, `ALL`, `foo`; con `{ scope: "mine", organizerId: "x" }` la salida es `{ scope: "mine" }`.
- `modules/event/lib/event-scope.test.ts` — AC3: `permissionForScope` de los 3 scopes; combinado con `can`: customer no puede `mine` ni `all`, organizer puede `mine` y no `all`, admin y super_admin pueden ambos, `published` sin permiso; `statusForAuthError`: `unauthenticated` 401, `suspended` y `forbidden` 403.
- `modules/event/lib/event-list.test.ts` — AC4 (forma), AC5, AC7, AC8, AC9: suma de tiers en sold/capacity/revenue; evento sin tipos (capacity 0, `tiers: []`, `priceFromCents` null); evento con tipos y sin ventas (`tierSold` null y `"0"`) → 0; strings de bigint (`"12345678901"`) parseados; valor fuera de rango seguro lanza; `priceFromCents` = mínimo; tiers ordenados por `sortOrder`; orden de eventos conservado; `includeSales: false` no tiene clave `sales`; conjunto exacto de claves de `EventListItem` y `ManagedEventItem` (sin `organizerId`/`clerkUserId`); `startsAt` en ISO.
- `modules/event/lib/format.test.ts` — AC11: `formatPriceCents(0) = "S/ 0"`, `12345 → "S/ 123"`, `123456789012 → "S/ 1,234,567,890"`; `isoToLimaDate` con `2026-11-14T21:00:00-05:00` → `2026-11-14`, `2026-11-15T02:00:00Z` → `2026-11-14`, `2026-11-15T05:00:00Z` → `2026-11-15`.
- `modules/event/services/event-list-client.test.ts` — AC13: `shouldRetryEvents` es false para `EventListError` 400/401/403, true en el primer fallo de 500 o de un `TypeError` de red, false desde el segundo fallo.
- `modules/organizer/lib/event-stats.test.ts` — AC10, AC16: `soldPercent` (0 capacidad → 0, redondeo, tope 100); `getOrganizerKpis` suma sold y revenueCents de todos los eventos y cuenta solo `published` (un `cancelled` con ventas suma ventas pero no publicados; lista vacía → ceros); `filterEventsByStatus`.
- `modules/organizer/lib/event-draft.test.ts` — sigue verde con el fixture inline (sin cambiar sus casos).

Verificación manual (humano, tras promover a `lenadrito2@gmail.com` y correr el seed): `/organizer` muestra 8 eventos publicados, `Eventos publicados 8`, `Entradas vendidas 0`, `Ingresos S/ 0`, cada fila `0 / <capacidad> vendidas` y "Ver ventas" con sus zonas; con un `customer` en la consola `fetch("/api/events?scope=mine")` → 403 y `?scope=all` con organizer → 403; sin sesión → 401; `?scope=published` → 200 sin `sales`.

## Plan

### Phase 1 — Permisos y dominio puro (sin UI ni endpoint)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: permisos `events:read-own` / `events:read-all` y actualizar la matriz del test | modules/auth/lib/permissions.ts, modules/auth/lib/permissions.test.ts | - | A | AC1 | done |
| T2 | Tipos del listado, schema Zod de la query y reglas de scope/errores, con tests | modules/event/types/event-list.ts, modules/event/schemas/event-list-schema.ts, modules/event/schemas/event-list-schema.test.ts, modules/event/lib/event-scope.ts, modules/event/lib/event-scope.test.ts | T1 | B | AC2, AC3 | done |
| T3 | Constructor puro `buildEventList` (plegado de filas, montos, sin `sales` en público), con tests | modules/event/lib/event-list.ts, modules/event/lib/event-list.test.ts | T2 | C | AC4, AC5, AC7, AC8, AC9 | done |

### Phase 2 — Endpoint, servicio, provider y hook (la app sigue igual, nadie lo consume aún)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: `QueryProvider` y montaje en el layout raíz | components/shared/query-provider.tsx, app/layout.tsx | - | A | AC12 | done |
| T2 | Servicio de servidor `listEvents` (consulta agregada) y entrada `server.ts` | modules/event/services/event-list-service.ts, modules/event/server.ts | Phase 1 | A | AC4, AC5, AC7, AC9 | done |
| T3 | Route handler `GET /api/events` (Zod, `requirePermission`, códigos HTTP, cache-control) | app/api/events/route.ts | T2 | B | AC2, AC3, AC6 | done |
| T4 | Cliente `fetchEvents`/`shouldRetryEvents` con test, hook `useEvents` (key con `userId`) y exports client-safe | modules/event/services/event-list-client.ts, modules/event/services/event-list-client.test.ts, modules/event/hooks/use-events.ts, modules/event/index.ts | T1, Phase 1 | A | AC13, AC19 | done |

### Phase 3 — Dashboard con datos reales
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: `npx shadcn@latest add skeleton`; `formatPriceCents` e `isoToLimaDate` con tests; exportarlos en el `index.ts` | components/ui/skeleton.tsx, modules/event/lib/format.ts, modules/event/lib/format.test.ts, modules/event/index.ts | Phase 2 | A | AC11 | done |
| T2 | `event-stats.ts` sobre `ManagedEventItem` (`soldPercent`, `getOrganizerKpis`, `filterEventsByStatus`), reescribir su test | modules/organizer/lib/event-stats.ts, modules/organizer/lib/event-stats.test.ts | Phase 1 | A | AC10, AC16 | done |
| T3 | `EventSalesSheet` sobre `ManagedEventItem` (tiers reales, sin link al catálogo, sin tipos de entrada) | modules/organizer/components/event-sales-sheet.tsx | T1, T2 | B | AC16 | done |
| T4 | Estados presentacionales: esqueleto y error (con/sin reintento) | modules/organizer/components/dashboard-states.tsx | T1 | B | AC15 | done |
| T5 | `OrganizerDashboard` con `useEvents("mine")`, KPIs y filas reales, estados de carga/error/vacío, badges de 4 estados, fecha Lima, copy de `?saved=` | modules/organizer/components/organizer-dashboard.tsx | T1, T2, T3, T4 | C | AC14, AC15, AC16, AC17 | done |

### Phase 4 — Limpieza y documentación
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | Borrar `ORGANIZER_EVENTS`, estado inicial del store en `[]`, fixture inline en `event-draft.test.ts`; `grep ORGANIZER_EVENTS` limpio | modules/organizer/data/organizer-events.ts, modules/organizer/store/use-organizer-store.ts, modules/organizer/lib/event-draft.test.ts | Phase 3 | A | AC18 | done |
| T2 | Documentar `GET /api/events`, permisos nuevos y definiciones de métricas | docs/architecture/system-design.md, docs/architecture/mer.md | Phase 3 | A | AC21 | done |

## Open questions
Ninguna bloquea; todo tiene default propuesto (D1–D13). Confirmar puntualmente:
- Q1 (D9) Copy del aviso tras guardar en el formulario: "Guardamos tu evento en este navegador. Todavía no aparece en el resumen." Default: ese texto, hasta la spec de escritura.
- Q2 (D2) Un `admin` o `super_admin` en `/organizer` ve **solo sus propios eventos** (`mine`), no los de todos. La vista global es para `/admin` con `scope=all`. Default: así.
- Q3 (D8) Los borradores guardados en el formulario quedan inaccesibles desde la UI hasta la spec de escritura (el link "Editar" del dashboard desaparece). Default: aceptado como hueco conocido.
- Q4 (D10) Se quita "Ver página del evento" del sheet mientras el detalle público siga en mock. Default: quitarlo.
