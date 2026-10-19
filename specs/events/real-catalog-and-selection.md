# Catálogo público y selección de entradas con datos reales

- Module: event, purchase
- Status: approved
- Approved by: lenadro291 (2026-10-18)
- Mode: SDD

## Goal
Que la landing, la búsqueda, el detalle y la selección de entradas muestren los eventos **publicados de la base de datos** (los que crea el organizador con el CRUD de eventos), con precios y cupos reales por zona, en vez del catálogo mock. Un evento suspendido o cancelado desaparece; una zona sin cupo no se puede elegir. Se vende **por zona y cantidad** (decisión de la tarjeta 11, mer.md "Fuera del modelo por decisión"): el mapa de zonas queda como ayuda visual y se quita la elección de butacas.

## Scope
- In:
  - Lógica pura con tests: disponibilidad por zona y por evento, mapeo de filas de BD a las vistas `EventSummary` / `EventDetail`, layout automático del mapa de zonas a partir de los tipos de entrada.
  - Servicios de servidor (solo lectura): catálogo de eventos publicados y futuros, detalle por slug, destacados, relacionados, opciones de filtro (categorías y ciudades) y zonas con disponibilidad de un evento.
  - Rutas por slug: `/events/[slug]`, `/events/[slug]/tickets`, `/checkout?event=<slug>`.
  - Landing, búsqueda, detalle, selección y checkout (que sigue simulado) leyendo de la BD.
  - Selección solo por zona y cantidad: se borran el mapa de butacas, "mejores disponibles", los chips de butacas y los asientos del carrito.
  - Portadas de Vercel Blob en `next/image` (`images.remotePatterns`) y placeholder para eventos sin portada.
  - El mock del catálogo pasa a ser solo del seed (`db/seed/data/`); el runtime deja de usarlo.
  - Docs (system-design §2/§3 y mer "Reglas de negocio").
- Out:
  - Cobro real, órdenes en BD y reservas (tarjetas 14–18, Stripe). El checkout sigue guardando la orden en localStorage.
  - "Mis entradas" real (tarjeta 19): sigue con sus datos de ejemplo.
  - Butacas numeradas, recintos y edición de categorías.
  - Búsqueda o paginación en servidor (los filtros siguen en el cliente, D10).
  - Columnas nuevas: "Apertura de puertas" y "Edad mínima" no existen en la BD y salen de la UI (D4).

## Decisiones (propuestas; el usuario valida)
| # | Decisión |
| - | -------- |
| D1 | **El slug es la clave pública.** Las rutas pasan de `[id]` a `[slug]` y `EventSummary.id` contiene el slug (se conserva el nombre del campo para no tocar los ~15 lugares que arman links y claves de carrito; se documenta en el tipo). Los ids mock (`evt-001`) dejan de existir: un link viejo da 404. |
| D2 | **Qué es público.** Catálogo, búsqueda, destacados y relacionados: `status = 'published'` y `starts_at > now()`. El detalle, la selección y el checkout de un evento no publicado (borrador, suspendido, cancelado) o ya pasado responden `notFound()`, igual que uno inexistente. |
| D3 | **Categoría como texto.** `EventSummary.category` pasa de la unión `EventCategory` a `string` (el nombre de la tabla `categories`). Las opciones del filtro de categorías salen de `listCategories()` y las de ciudad, de los eventos listados. `EVENT_CATEGORIES` queda solo para el seed. |
| D4 | **Sin "Apertura de puertas" ni "Edad mínima".** No hay columnas; se quitan de `EventDetail` y del detalle. Queda "Inicio del show" (`isoToLimaTime`). Agregarlas es una migración aparte si se piden. |
| D5 | **Portada.** `cover_image_url` o, si es nula, `/images/events/placeholder.png` (archivo nuevo, neutro, 16:9). `imageAlt` = `Portada de «título»`. `next.config.ts` agrega `images.remotePatterns` para `https://*.public.blob.vercel-storage.com`. |
| D6 | **Disponibilidad** (mer, "Reglas de negocio"): por zona `available = max(0, capacity − pagadas − pendientes vigentes)`. Estado de la zona: `sold-out` si `available = 0`; `last-tickets` si `available ≤ max(10, 10 % de capacity)`; si no, `available`. Estado del evento: `sold-out` si todas sus zonas lo están, `last-tickets` si alguna está en últimas entradas, si no `available`. Se calcula al consultar; nunca se guarda. |
| D7 | **Precio "Desde".** Mínimo `price_cents` entre las zonas con cupo; si todas están agotadas, el mínimo de todas. Las vistas siguen en soles (`priceFrom = cents / 100`), moneda siempre `PEN`. |
| D8 | **Destacados y relacionados.** No hay columna "destacado": la landing muestra los 5 próximos eventos. Relacionados: misma categoría primero y luego por fecha más cercana (el criterio actual), sobre el catálogo público, sin el propio evento. |
| D9 | **Zonas.** Cada tipo de entrada es una zona de admisión general. El mapa de zonas se genera solo (`buildZoneLayout`): anillos concéntricos alrededor del escenario en el orden de `sort_order` (el primero, el más cercano), con colores de una paleta fija por posición. Cantidad máxima por zona = `min(max_per_order, available)`. Se borran `seat-map`, `seat-chips`, `best-seats`, `seat-layout` (con sus tests) y `toggleSeat`/`setSeats`/`seatIds` del carrito. |
| D10 | **Filtros en el cliente**, como hoy, sobre la lista completa de próximos eventos. `// ponytail:` techo ~500 eventos; después, búsqueda y paginación en servidor. |
| D11 | **Mock solo para el seed.** `modules/event/data/*`, `modules/event/services/event-service.ts` (salvo `filterEvents`, que pasa a `lib/` porque la búsqueda la usa) y `modules/purchase/data/venues.ts` se mueven a `db/seed/data/`. El seed deja de calcular butacas: zonas numeradas del mock con capacidad fija `NUMBERED_ZONE_CAPACITY = 500` (se actualiza su test). |
| D12 | **Una consulta por pantalla.** El catálogo trae eventos + zonas + agregados de ventas en una consulta (como `listEvents`) y se pliega en TypeScript. Sin caché: las páginas ya son dinámicas. |

## Reuse
Reference: mer.md `events`, `ticket_types`, `orders`, `order_items` y "Reglas de negocio derivadas del modelo"; system-design §2 ("Listado de eventos") y §3 (flujo de compra); `specs/organizer/event-crud.md` (D19: solo se vende `published` y futuro).
- Reuse: `listEvents`/`buildEventList` (patrón de consulta con `sum … filter (where …)` y plegado), `loadTiers` de `event-sales.ts` (agregado de pagadas/pendientes por tipo), `listCategories`, `isoToLimaDate`, `isoToLimaTime`, `formatPrice`, componentes de catálogo (`EventCard`, `FeaturedCarousel`, `HomePage`, `EventSearch`, `EventDetailView`, `RelatedEventCard`) y de compra (`TicketSelection`, `ZonePicker`, `ZoneMap`, `GaQuantity`, `OrderSummary`, `CheckoutView`) sin rediseñar.
- Reuse: `venue-geometry.ts` (arcos del mapa de zonas), `zone-style.ts`, `useEventCart`, `getCartSummary`.
- Replace: `event-service.ts` (mock) → `catalog-service.ts` (BD); `venue-service.ts` (mock) → `zone-service.ts` (BD).
- Delete: `seat-map.tsx`, `seat-chips.tsx`, `lib/best-seats.ts`, `lib/seat-layout.ts` (+ tests), campos de butacas en `types/venue.ts` y en el carrito.
- New: `modules/event/lib/{availability,catalog-mapper,event-filter}.ts`, `modules/event/services/catalog-service.ts`, `modules/purchase/lib/zone-layout.ts`, `modules/purchase/services/zone-service.ts`, `public/images/events/placeholder.png`, `db/seed/data/*`.
- No se instala nada.

## Acceptance criteria
- AC1: `availability.ts` implementa D6 y D7 (zona, evento y "Desde") y está testeado en los bordes (0, exacto al umbral, 10 % vs 10 fijos, todas agotadas).
- AC2: `catalog-mapper.ts` convierte filas de BD en `EventSummary` / `EventDetail` (slug como `id`, fecha y hora de Lima, portada o placeholder, alt, categoría, moneda PEN, estado y "Desde" de AC1), con test.
- AC3: `buildZoneLayout` genera un `VenueLayout` válido para 1 a 10 zonas (anillos sin superponerse, en orden, con color y nombre corto), con test.
- AC4: `catalog-service` devuelve solo eventos `published` con `starts_at > now()` (D2), ordenados por fecha; `getPublicEventBySlug` devuelve `null` para un slug inexistente, un evento no publicado o pasado; destacados = 5 próximos; relacionados según D8; opciones de filtro desde la BD. Nunca devuelve `organizerId` ni datos de compradores.
- AC5: `getEventZones(slug)` devuelve las zonas del evento público con precio, `available`, `maxPerOrder` y estado (D6, D9), o `null` según D2.
- AC6: La landing, `/events` y `/events/[slug]` muestran eventos de la BD. Publicar un evento desde el panel lo hace aparecer; suspenderlo o cancelarlo lo saca (y su detalle da 404). Los filtros de categoría y ciudad muestran las opciones reales.
- AC7: El detalle ya no muestra "Apertura de puertas" ni "Edad mínima"; un evento sin portada muestra el placeholder; una portada de Blob se ve con `next/image`.
- AC8: `/events/[slug]/tickets` muestra las zonas reales en el mapa automático y en la lista, con su precio. Una zona agotada no se puede elegir; la cantidad de una zona no supera `min(max_per_order, available)`.
- AC9: El checkout (`/checkout?event=<slug>`) arma el resumen con las zonas y precios reales; el flujo simulado sigue terminando en la confirmación.
- AC10: No queda código de butacas (`grep -rn "seatIds\|SeatMap\|BestSeats\|seat-layout" modules app` vacío) ni lectura de mock en runtime (`modules/` no importa `data/events`, `data/event-details` ni `data/venues`).
- AC11: `npm run db:seed` sigue funcionando desde `db/seed/data/` (D11) y su test pasa.
- AC12: Cierre de cada fase: lint, tsc y tests en verde; Fases 3 y 4 además `npm run build`.

## Contracts

### Disponibilidad (`modules/event/lib/availability.ts`, puro)
```ts
export function tierAvailable(t: { capacity: number; paid: number; reserved: number }): number; // max(0, …)
export function tierStatus(t: { capacity: number; available: number }): AvailabilityStatus;   // D6
export function eventStatus(tiers: { status: AvailabilityStatus }[]): AvailabilityStatus;    // D6; sin zonas → "sold-out"
export function priceFromCents(tiers: { priceCents: number; available: number }[]): number | null; // D7
```

### Vistas (`modules/event/types/event.ts`)
```ts
export interface EventSummary {
  id: string;            // slug: clave pública de rutas y carrito (D1)
  title: string;
  category: string;      // nombre de la categoría (D3)
  image: string;         // portada o placeholder (D5)
  imageAlt: string;
  date: string;          // yyyy-mm-dd en Lima
  venue: string;
  city: string;
  currency: Currency;    // siempre "PEN"
  priceFrom: number;     // soles (D7)
  status: AvailabilityStatus;
}
export interface EventDetail extends EventSummary {
  startTime: string;     // HH:mm en Lima
  description: string;
  address: string;
}
```

### Mapeo (`modules/event/lib/catalog-mapper.ts`, puro)
```ts
export interface CatalogRow { slug: string; title: string; categoryName: string; coverImageUrl: string | null; startsAt: Date; venueName: string; address: string | null; city: string; description: string | null;
  tierId: string | null; tierName: string | null; tierPriceCents: number | null; tierCapacity: number | null; tierMaxPerOrder: number | null; tierSortOrder: number | null; tierPaid: number; tierReserved: number }
export const PLACEHOLDER_IMAGE = "/images/events/placeholder.png";
export function toEventDetails(rows: CatalogRow[]): EventDetail[]; // agrupa por slug conservando el orden de las filas
```

### Catálogo (`modules/event/services/catalog-service.ts`, exportado por `server.ts`)
```ts
export async function listUpcomingEvents(now?: Date): Promise<EventSummary[]>;
export async function getPublicEventBySlug(slug: string, now?: Date): Promise<EventDetail | null>;
export async function getFeaturedEvents(now?: Date): Promise<EventSummary[]>;            // 5 próximos
export async function getRelatedEvents(event: EventSummary, now?: Date): Promise<EventSummary[]>; // hasta 4
export async function getCatalogFilterOptions(now?: Date): Promise<{ categories: string[]; cities: string[] }>;
// modules/event/lib/event-filter.ts (movido desde event-service, sin cambios de lógica)
export function filterEvents(events: EventSummary[], filters?: EventFilters): EventSummary[];
```
`EventFilters.categories` pasa a `string[]`.

### Zonas (`modules/purchase/types/venue.ts`, `lib/zone-layout.ts`, `services/zone-service.ts`)
```ts
export interface ZoneTier extends VenueZone { price: number /* soles */; status: AvailabilityStatus; available: number; maxPerOrder: number }
export interface EventVenue { eventId: string /* slug */; currency: Currency; layout: VenueLayout; tiers: ZoneTier[] } // sin `sections`
export interface CartLine { zoneId: string /* ticket_types.id */; quantity: number }                                // sin `seatIds`
export function buildZoneLayout(tiers: { id: string; name: string }[]): VenueLayout; // D9
export async function getEventZones(slug: string, now?: Date): Promise<EventVenue | null>; // exportado por modules/purchase/server.ts (nuevo)
```
`VenueZone.kind` desaparece (todas las zonas son de admisión general); `VenueLayoutId` y `priceFactor` se van con el mock.

### Carrito (`modules/purchase/store/use-cart-store.ts`)
```ts
setQuantity(eventId: string, zoneId: string, quantity: number, max: number): void; // max = min(maxPerOrder, available)
clear(): void;
```

## Edge cases
- Evento publicado sin tipos de entrada: no puede existir (publicar exige ≥ 1, event-crud D4); si aparece por datos viejos, sale como `sold-out` y "Desde" `null` → se muestra "S/ —".
- Zona con `capacity = 0` (retirada, event-crud D5): `available = 0`, `sold-out`, no se puede elegir.
- Evento que pasa a `suspended` o `cancelled` con la página abierta: el siguiente request da 404; el carrito local de ese evento queda huérfano y el checkout muestra "vacío".
- Carrito con zona que ya no existe o ya no tiene cupo: `getCartSummary` ignora la línea desconocida; la cantidad se recorta al nuevo máximo al volver a la selección.
- Fecha que pasa mientras el evento está en pantalla: se excluye en el siguiente request (D2).
- Slug con caracteres raros en la URL: se busca tal cual con `eq`; no matchea → 404.
- Dos eventos con el mismo título: slugs distintos (event-crud D16), cada uno con su URL.
- Portada `/images/…` del seed: se sirve local; portada de Blob: remota por `remotePatterns`.

## Tests
Sin tests de BD ni de componentes (SETUP §3). Las consultas se verifican por lectura del reviewer y con una prueba de humo contra la BD de desarrollo (publicar, suspender, ver catálogo y zonas).
- `modules/event/lib/availability.test.ts` — AC1.
- `modules/event/lib/catalog-mapper.test.ts` — AC2: agrupado por slug, fecha/hora Lima, placeholder, alt, "Desde" y estado con varias zonas.
- `modules/event/lib/event-filter.test.ts` — los casos actuales de `filterEvents` (movidos), con categorías como texto.
- `modules/purchase/lib/zone-layout.test.ts` — AC3.
- `modules/purchase/store/use-cart-store.test.ts` y `lib/cart-summary.test.ts` — actualizados sin butacas; el máximo por zona se respeta.
- `db/seed/mock-to-rows.test.ts` — AC11 con la capacidad fija de zonas numeradas.
- Se borran `best-seats.test.ts` y `seat-layout.test.ts`.

## Plan

### Phase 1 — Dominio puro (la app no cambia)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | Disponibilidad con test | modules/event/lib/availability.ts, modules/event/lib/availability.test.ts | - | A | AC1 | done |
| T2 | Layout automático de zonas con test | modules/purchase/lib/zone-layout.ts, modules/purchase/lib/zone-layout.test.ts | - | A | AC3 | done |

### Phase 2 — Catálogo en la BD (tarjeta 12)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: tipos `EventSummary`/`EventDetail`/`EventFilters` (D3, D4), `filterEvents` a `lib/event-filter.ts` (+test movido), placeholder, `next.config.ts` | modules/event/types/event.ts, modules/event/lib/event-filter.ts, modules/event/lib/event-filter.test.ts, public/images/events/placeholder.png, next.config.ts | Phase 1 | A | AC2, AC7 | todo |
| T2 | Mapeo con test y `catalog-service` | modules/event/lib/catalog-mapper.ts, modules/event/lib/catalog-mapper.test.ts, modules/event/services/catalog-service.ts, modules/event/server.ts | T1 | B | AC2, AC4 | todo |
| T3 | Páginas y componentes del catálogo: rutas `[slug]`, landing, búsqueda (opciones de filtro), detalle sin puertas/edad, exports de `index.ts` | app/page.tsx, app/events/page.tsx, app/events/[slug]/page.tsx, modules/event/components/*, modules/event/index.ts | T2 | C | AC6, AC7 | todo |

Nota Fase 2: T3 también mueve `app/events/[id]/tickets/page.tsx` a `[slug]` apuntando todavía al flujo actual con `getEventZones` de la Fase 3 no disponible: para que `tsc` pase, la página de entradas se adapta en la misma fase con un `notFound()` temporal si no hay zonas. Cierra con `npm run build`.

### Phase 3 — Selección por zona y cantidad (tarjeta 13)
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: tipos de venue y carrito sin butacas (+tests), `zone-service`, `modules/purchase/server.ts` | modules/purchase/types/venue.ts, modules/purchase/store/use-cart-store.ts, modules/purchase/store/use-cart-store.test.ts, modules/purchase/lib/cart-summary.ts, modules/purchase/lib/cart-summary.test.ts, modules/purchase/services/zone-service.ts, modules/purchase/server.ts | Phase 2 | A | AC5 | todo |
| T2 | UI: `TicketSelection`, `ZonePicker`, `ZoneMap`, `GaQuantity`, `OrderSummary`, `ZonePriceList`, `useEventCart`, checkout y páginas `tickets`/`checkout`; borrar código de butacas | modules/purchase/components/*, modules/purchase/hooks/use-event-cart.ts, modules/purchase/lib/{best-seats,seat-layout}.ts (+tests), modules/purchase/index.ts, app/events/[slug]/tickets/page.tsx, app/checkout/page.tsx, app/events/[slug]/page.tsx | T1 | B | AC8, AC9, AC10 | todo |

Nota Fase 3: cierra con `npm run build` y el `grep` de AC10.

### Phase 4 — Mock solo para el seed y docs
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | Mover mock a `db/seed/data/`, capacidad fija de zonas numeradas, borrar `event-service.ts`/`venue-service.ts` y datos mock de los módulos | db/seed/*, modules/event/data/*, modules/event/services/event-service.ts, modules/event/services/event-service.test.ts, modules/purchase/data/venues.ts, modules/purchase/services/venue-service.ts, modules/purchase/services/venue-service.test.ts | Phase 3 | A | AC10, AC11 | todo |
| T2 | Docs: system-design (catálogo público, rutas por slug, zonas) y mer (disponibilidad D6/D7) | docs/architecture/system-design.md, docs/architecture/mer.md | Phase 3 | A | - | todo |

## Open questions
Resueltas por el usuario (2026-10-18): se aceptan los defaults de Q1–Q5. Texto original:
- Q1 (D1) Se conserva el campo `id` con el slug para no tocar ~15 usos. Alternativa: renombrarlo a `slug` (más claro, más diff). Default: conservar `id`.
- Q2 (D2) Los eventos pasados desaparecen del catálogo y su detalle da 404. Alternativa: detalle visible como "Evento finalizado". Default: 404.
- Q3 (D4) Se quitan "Apertura de puertas" y "Edad mínima" del detalle. Alternativa: agregarlas al formulario y a la BD (migración). Default: quitarlas.
- Q4 (D6) Umbral de "Últimas entradas": `≤ max(10, 10 %)` de la capacidad de la zona. Default: así.
- Q5 (D8) Destacados = 5 próximos eventos (sin columna "destacado"). Default: así.
