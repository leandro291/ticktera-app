# Ticketera — UI (landing + búsqueda → compra → cuenta → organizador)

- Module: shared (event, purchase, auth, account, organizer)
- Status: approved
- Approved by: noe12claude (2026-09-29)
- Mode: SDD

## Goal
Implementar en Next.js la landing y las pantallas de features 2–8 del diseño de Claude Design (desktop 1440 + móvil 390), solo UI/UX con datos mock y estado en cliente, incluyendo un **mapa de asientos seleccionable** con zoom/pan para las zonas numeradas.

Fuente visual: artifact de diseño `Ticketera Landing Redesign` (tableros `Main` (landing, Hero A), `Mobile`, `Search`, `EventDetail`, `Tickets`, `Checkout`, `Confirmation`, `Auth`, `MyTickets`, `OrgDashboard`, `OrgCreate` y sus variantes `*Mobile`). Donde esta spec no diga algo, manda el diseño.

## Scope
- In:
  - Landing `/` (Hero A panel partido con carrusel autoplay pausable, categorías, grilla de eventos filtrable por categoría, secciones del diseño; versión móvil).
  - Design tokens del diseño (Poppins, indigo `#4F46E5` primario, naranja `#F97316` CTA, neutros zinc, radios 12–24px) en `app/globals.css`.
  - Datos mock tipados (los 10 eventos de la landing, zonas/precios, butacas, pedidos, eventos del organizador) e imágenes del diseño en `public/images/events/`.
  - Header/footer públicos compartidos, header de pasos de compra.
  - 2 · Búsqueda y listado (filtros, orden, chips; panel de filtros a pantalla completa en móvil).
  - 3 · Detalle de evento (guardar, compartir, info, lugar, tarjeta de compra, relacionados; barra de compra fija en móvil).
  - 4 · Selección de entradas: mapa de zonas + **mapa de butacas** para zonas numeradas + cantidades para zonas de campo + resumen.
  - 5 · Checkout (temporizador, datos comprador, métodos Tarjeta / Yape / PagoEfectivo, términos, resumen; resumen plegable en móvil).
  - 6 · Confirmación (entrada con QR decorativo) y Mis entradas (pestañas, lista de pedidos, carrusel de entradas).
  - 7 · Login / registro (pestañas, mostrar contraseña).
  - 8 · Panel de organizador y Crear evento (formulario con tipos de entrada dinámicos + vista previa en vivo).
  - Responsive: un único componente por pantalla, mobile-first, layout desktop desde `lg`.
- Out:
  - Variante Hero B del diseño (se usa Hero A).
  - Backend, auth real, pagos reales, persistencia (el carrito vive en memoria del cliente).
  - Editor de mapas de asientos para el organizador (solo se consume un layout mock).
  - QR real, emails, i18n, dark mode.

## Seat map — decisión de librería
Evaluadas (npm, 2026-09):

| Opción | Compatibilidad con el proyecto | Veredicto |
| ------ | ------------------------------ | --------- |
| `@alisaitteke/seatmap-canvas` | peer `react ^18` | ✗ incompatible con React 19 |
| `react-konva` 19.3 + `konva` | peer `react ^19.3.0` (tenemos 19.2.8); canvas → sin DOM accesible ni Tailwind | ✗ por ahora; solo vale la pena >5k butacas simultáneas |
| `react-seat-picker`, `seatchart` | abandonadas (React 15/16, 2022) | ✗ |
| seatmap.pro y similares | SDK comercial, requiere su backend | ✗ fuera de alcance |
| **SVG propio + `react-zoom-pan-pinch` 4.x** | peer `react: *`, mantenida (sep 2026), ~10 kB | ✓ **elegida** |

Por qué: cada butaca es un `<button>`/elemento SVG con `aria-label`, foco por teclado y estilos Tailwind (tokens del diseño); el layout sale de datos (JSON) así que el backend futuro solo cambia la fuente; `react-zoom-pan-pinch` da pinch-zoom y arrastre en móvil y rueda/botones en desktop sin reinventarlos. El flujo es en dos niveles (zona → butacas), así nunca se renderizan más de unos cientos de butacas a la vez, dentro de lo que SVG maneja sin problema.

## Reuse
- Reuse: `components/ui/button.tsx`, `lib/utils.ts` (`cn`), `lucide-react` (iconos del diseño son Lucide), `zustand` (carrito), `next/image`, `next/font/google` (Poppins).
- Extend: `app/globals.css` — tokens del diseño; `app/layout.tsx` — fuente Poppins, `lang="es"`, metadata.
- New (shadcn, se agregan en setup): `input`, `label`, `checkbox`, `badge`, `tabs`, `select`, `textarea`, `sheet` (panel de filtros y butacas en móvil), `separator`.
- New: `react-zoom-pan-pinch` (ver decisión arriba); `vitest` para los tests de lógica del carrito/butacas (primer test del repo).
- New: módulos `event`, `purchase`, `auth`, `account`, `organizer` (no existe ningún módulo aún).

## Routes (app/ = solo routing)
| Ruta | Pantalla |
| ---- | -------- |
| `/` | Landing |
| `/events` | Búsqueda y listado (`?q=&category=`) |
| `/events/[id]` | Detalle |
| `/events/[id]/tickets` | Selección de entradas / mapa |
| `/checkout` | Datos y pago |
| `/checkout/confirmation` | Confirmación |
| `/login` | Login / registro (`?mode=register`) |
| `/my-tickets` | Mis entradas |
| `/organizer` | Panel |
| `/organizer/events/new` | Crear evento |

## Acceptance criteria
- AC1 (tokens): la app usa Poppins, primario `#4F46E5`, CTA naranja `#F97316` con texto `#18181B`, fondo `#F4F4F5` en flujos de compra; `focus-visible` con anillo `#818CF8`.
- AC0 (landing): `/` replica `Main`/`Mobile`: carrusel de 5 destacados (autoplay 6s, pausa/reproducir, anterior/siguiente, se detiene con `prefers-reduced-motion`), chips de categoría que filtran la grilla con estado vacío, tarjetas que enlazan a `/events/[id]`, buscador que navega a `/events?q=`.
- AC2 (búsqueda): `/events` lista los 10 eventos mock; buscar por texto filtra por título/lugar/ciudad; filtros por categoría, ciudad, fecha y precio; chips de filtros activos removibles; orden por fecha o precio; estado vacío con "Limpiar filtros". En móvil los filtros abren un panel a pantalla completa con botón "Ver N eventos".
- AC3 (detalle): `/events/[id]` muestra hero, acerca, información importante, lugar, tarjeta de entradas por zona (Agotado / Últimas entradas) y relacionados; botón guardar alterna estado; CTA lleva a `/events/[id]/tickets`. En móvil hay barra de compra fija abajo. `id` inexistente → `notFound()`.
- AC4 (mapa de zonas): la pantalla de entradas dibuja el mapa de zonas del diseño (Escenario, Campo VIP, Campo General, Tribunas Occidente/Oriente/Norte) como SVG accesible; zonas agotadas se ven deshabilitadas; tocar una zona la selecciona (`aria-pressed`) y resalta su fila en la lista.
- AC5 (butacas): seleccionar una zona numerada (tribunas) muestra su mapa de butacas (filas × asientos) con leyenda Disponible / Seleccionada / Ocupada; zoom con botones, rueda y pinch, y arrastre; cada butaca es enfocable con `aria-label="Fila C, asiento 12, S/ 380"` y se alterna con click/Enter/Espacio; las ocupadas no son seleccionables. En desktop va en la tarjeta del mapa; en móvil en un `Sheet` a pantalla completa.
- AC6 (límites): máximo 6 entradas por zona (cantidades o butacas); al llegar al límite los `+` y las butacas libres de esa zona se deshabilitan y se anuncia el motivo.
- AC7 (resumen): el resumen lista cantidad × zona (y las butacas "Fila C · 12, 13" en zonas numeradas), total en `S/` con formato `es-PE` y contador; "Continuar" solo habilitado con ≥1 entrada. En móvil es barra fija abajo.
- AC8 (checkout): `/checkout` muestra pasos (2 activo), temporizador 10:00 regresivo, datos del comprador, métodos de pago con su formulario (tarjeta / Yape / PagoEfectivo), checkbox de términos que habilita "Pagar", y el resumen del carrito; en móvil el resumen es plegable. Sin carrito → estado vacío con link a eventos. Pagar vacía el carrito y navega a confirmación.
- AC9 (confirmación): `/checkout/confirmation` muestra "¡Compra confirmada!", entrada con QR decorativo (patrón del diseño), código de pedido y "Qué sigue".
- AC10 (auth): `/login` alterna "Iniciar sesión" / "Crear cuenta" con pestañas y links cruzados; botón mostrar/ocultar contraseña con `aria-pressed`; enviar navega a `/my-tickets` (sin validación de backend).
- AC11 (mis entradas): pestañas Próximas (2) / Pasadas (0 con estado vacío); seleccionar pedido muestra su entrada; flechas recorren las entradas del pedido (deshabilitadas en extremos).
- AC12 (panel organizador): sidebar (drawer en móvil), métricas resumen, lista "Mis eventos" con filtros por estado y acción por fila.
- AC13 (crear evento): formulario de información básica, fecha y lugar, imagen de portada, tipos de entrada (agregar/quitar, mínimo 1), capacidad total calculada y vista previa en vivo de la tarjeta del evento.
- AC14 (responsive): cada pantalla respeta el layout móvil a 390px sin scroll horizontal y el desktop a ≥1024px.
- AC15 (calidad): `npm run lint`, `npx tsc --noEmit` y `npm test` en verde; `npm run build` compila.

## Contracts

```ts
// modules/event/types/event.ts
export type EventCategory = "Conciertos" | "Deportes" | "Teatro" | "Festivales" | "Familiar" | "Cine" | "Comedia" | "Arte y Exposiciones";
export type AvailabilityStatus = "available" | "last-tickets" | "sold-out";
export interface EventSummary {
  id: string; title: string; category: EventCategory;
  image: string; imageAlt: string;
  date: string;            // ISO yyyy-mm-dd; los textos (día, mes, "sáb 14 nov") se derivan con Intl es-PE
  venue: string; city: string;
  currency: "PEN" | "USD" | "EUR"; priceFrom: number;
  status: AvailabilityStatus;
}
export interface EventDetail extends EventSummary {
  time: string; description: string; importantInfo: string[]; address: string;
  venueLayoutId: string;
}

// modules/event/services/event-service.ts (mock, async para simular futuro fetch)
export function getEvents(filters?: EventFilters): Promise<EventSummary[]>;
export function getEventById(id: string): Promise<EventDetail | null>;

// modules/purchase/types/venue.ts
export interface Zone {
  id: string; name: string; price: number; color: string; status: AvailabilityStatus;
  kind: "general-admission" | "numbered";
  shape: { x: number; y: number; width: number; height: number };   // viewBox del mapa de zonas
}
export interface Seat { id: string; row: string; number: number; x: number; y: number; taken: boolean }
export interface SeatSection { zoneId: string; seats: Seat[]; width: number; height: number }
export interface VenueLayout { id: string; zones: Zone[]; sections: SeatSection[] }

// modules/purchase/store/use-cart-store.ts (zustand)
export interface CartLine { zoneId: string; quantity: number; seatIds: string[] }  // quantity === seatIds.length en numeradas
interface CartState {
  eventId: string | null; lines: Record<string, CartLine>;
  setQuantity(eventId: string, zoneId: string, qty: number): void;
  toggleSeat(eventId: string, zoneId: string, seatId: string): void;
  clear(): void;
}
export const MAX_TICKETS_PER_ZONE = 6;

// modules/purchase/lib/cart-summary.ts (pura, testeada)
export function getCartSummary(lines: CartLine[], zones: Zone[]): { items: { zone: Zone; quantity: number; seats: Seat[]; amount: number }[]; total: number; count: number };
```

`index.ts` de cada módulo exporta solo lo que usan `app/` u otros módulos (componentes de página, tipos, service).

## Edge cases
- Cambiar de evento con un carrito de otro evento → el carrito se reinicia.
- Zona agotada: no seleccionable en mapa ni lista (`disabled`, texto "Agotado").
- Butaca ya seleccionada al llegar al límite: sigue pudiendo deseleccionarse.
- Temporizador llega a 00:00 → mensaje "Se acabó el tiempo" y botón para volver a elegir entradas.
- `/checkout` o `/checkout/confirmation` sin datos → estado vacío, nunca crash.
- Moneda distinta de PEN en eventos internacionales (US$, €) → el formateo usa la moneda del evento.
- `prefers-reduced-motion`: sin animación de zoom.

## Tests
- `modules/purchase/lib/cart-summary.test.ts` — AC7: totales, conteo, orden de butacas, carrito vacío.
- `modules/purchase/store/use-cart-store.test.ts` — AC6: tope por zona en cantidades y butacas, deseleccionar en el tope, butaca ocupada ignorada, reinicio al cambiar de evento.
- `modules/event/services/event-service.test.ts` — AC2: filtro por texto/categoría/ciudad/precio y orden.
- `modules/event/lib/format.test.ts` — AC1/AC7: formato de moneda y fechas es-PE.

## Plan

### Phase 1 — Fundaciones + búsqueda
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: deps (`react-zoom-pan-pinch`, `vitest`, `@types/node@22`), shadcn (input, label, checkbox, badge, tabs, select, textarea, sheet, separator, radio-group), tokens, Poppins, script `test`, imágenes | package.json, package-lock.json, vitest.config.mts, app/globals.css, app/layout.tsx, components/ui/*, public/images/events/* | - | A | AC1 | done |
| T2 | datos y formato de eventos | modules/event/types/event.ts, modules/event/data/events.ts, modules/event/lib/format.ts (+test), modules/event/lib/search-params.ts (+test), modules/event/services/event-service.ts (+test) | T1 | B | AC2 | done |
| T3 | header/footer públicos | components/shared/logo.tsx, components/shared/site-header.tsx, components/shared/site-footer.tsx, components/shared/mobile-menu.tsx, components/shared/nav-link.tsx, components/shared/site-nav.ts | T1 | B | AC1, AC14 | done |
| T4 | búsqueda y listado | modules/event/components/event-card.tsx, event-date-badge.tsx, event-status-badge.tsx, event-empty-state.tsx, event-search-bar.tsx, event-filters.tsx, event-search.tsx, modules/event/index.ts, app/events/page.tsx | T2, T3 | C | AC2, AC14 | done |

Notas de implementación (Phase 1):
- `components/shared/checkout-steps.tsx` se movió a Phase 3 (T9), donde se usa por primera vez (YAGNI).
- El registro `ui.shadcn.com` está bloqueado por la red del entorno remoto: los componentes `base-nova` se portaron desde el repo oficial `shadcn-ui/ui` (`apps/v4/registry/bases/base/ui` + `styles/style-nova.css`), equivalente a lo que genera `npx shadcn add`.
- `/events` lee `?q=&category=&city=&month=&price=` (`parseEventSearchParams`); el filtrado posterior es en cliente con `filterEvents`.

### Phase 1b — Landing
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T4b | landing: hero + buscador, carrusel, categorías + próximos eventos, cómo funciona, newsletter | modules/event/components/featured-carousel.tsx, home-catalog.tsx, newsletter-signup.tsx, home-page.tsx, app/page.tsx | Phase 1 | A | AC0, AC14 | done |

Notas: los CTA "Comprar entradas" / "Ver detalles" enlazan a `/events/[id]` y `/events/[id]/tickets`, que se implementan en Phase 2 (hasta entonces dan 404).

### Phase 2 — Detalle + selección de entradas con mapa
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T5 | detalle de evento | modules/event/types/event.ts (EventDetail), modules/event/data/event-details.ts, modules/event/services/event-service.ts (+test: getEventById, getRelatedEvents), modules/event/components/event-detail-view.tsx, event-actions.tsx, related-event-card.tsx, modules/event/index.ts, app/events/[id]/page.tsx | Phase 1 | A | AC3 | done |
| T6 | venue mock + carrito (store + summary + tests) | modules/purchase/types/venue.ts, modules/purchase/data/venues.ts, modules/purchase/lib/seat-layout.ts, modules/purchase/lib/zone-style.ts, modules/purchase/services/venue-service.ts (+test), modules/purchase/store/use-cart-store.ts (+test), modules/purchase/lib/cart-summary.ts (+test), modules/purchase/hooks/use-event-cart.ts | Phase 1 | A | AC6, AC7 | done |
| T7 | mapa de zonas + mapa de butacas | modules/purchase/components/zone-map.tsx, modules/purchase/components/seat-map.tsx (leyenda incluida), hooks/use-media-query.ts | T6 | B | AC4, AC5, AC6 | done |
| T8 | pantalla de entradas + resumen + header de pasos | modules/purchase/components/ticket-selection.tsx, ticket-tier-list.tsx, order-summary.tsx, purchase-header.tsx, zone-price-list.tsx, modules/purchase/index.ts, app/events/[id]/tickets/page.tsx | T7 | C | AC4–AC7, AC14 | done |

Notas de implementación (Phase 2):
- `EventDetail` quedó con `startTime`, `doorsTime`, `minAge`, `description`, `address`, `venueLayoutId` (en vez de `time` + `importantInfo[]`): el diseño muestra esas 4 tarjetas fijas.
- Layouts `stadium` y `theater` (JSON en `modules/purchase/data/venues.ts`). Los precios por zona salen de `priceFrom × priceFactor` (reproducen exactamente los del diseño para Bad Bunny) y la disponibilidad de `ZONE_STATUS_OVERRIDES` + estado del evento. Butacas generadas con PRNG determinista (mismo resultado en server y cliente).
- Mapa de zonas: botones HTML posicionados en % desde el layout (no SVG) para que el texto sea legible en 390px y 1440px con el mismo dato; el mapa de butacas sí es SVG + `react-zoom-pan-pinch`.
- Butacas: `role="checkbox"`, tabindex itinerante con flechas, Enter/Espacio para alternar; arrastrar no selecciona. Desktop: encuadre completo; móvil: `Sheet` a pantalla completa con escala táctil (~24px por butaca).
- El header de pasos vive en `modules/purchase/components/purchase-header.tsx` (solo lo usa el flujo de compra), no en `components/shared` (T9b queda cubierta).
- Evento agotado: `/events/[id]/tickets` redirige al detalle.
- "Continuar" enlaza a `/checkout?event=<id>` (Phase 3).

### Phase 3 — Checkout + confirmación
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T9 | checkout (temporizador, comprador, pago) | modules/purchase/components/checkout-view.tsx, checkout-fields.tsx, modules/purchase/hooks/use-countdown.ts, modules/purchase/lib/payment-format.ts (+test), modules/purchase/lib/order.ts (+test), modules/purchase/types/order.ts, modules/purchase/store/use-order-store.ts, app/checkout/page.tsx | Phase 2 | A | AC8 | done |
| T10 | confirmación + QR decorativo | modules/purchase/components/purchase-confirmation.tsx, modules/purchase/lib/calendar.ts (+test), components/shared/decorative-qr.tsx, app/checkout/confirmation/page.tsx | Phase 2 | A | AC9 | done |

Notas de implementación (Phase 3):
- `/checkout?event=<id>`: el server carga evento + venue; el cliente toma las líneas del carrito de ese evento. Sin `event`, evento inexistente o carrito vacío → estado vacío con link a `/events`.
- Pagar: validación nativa (`required` / `pattern`), formato de tarjeta `0000 0000 …` y `MM/AA`, 900 ms de "Procesando pago…", luego se guarda un `Order` inmutable en `useOrderStore.lastOrder`, se vacía el carrito y se navega a la confirmación.
- Temporizador de 10:00; al llegar a 0 se bloquea el formulario y se ofrece volver a elegir entradas.
- Confirmación: lee `lastOrder` (recargar la página muestra un estado vacío: no hay persistencia). "Agregar al calendario" descarga un `.ics`; "Descargar PDF" usa la impresión del navegador; "Ver mis entradas" → `/my-tickets` (Phase 4).
- Contratos nuevos: `Order`, `OrderItem`, `PaymentMethod` (`modules/purchase/types/order.ts`).

### Phase 4 — Cuenta
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T11 | login / registro + sesión mock + cuenta en el header | modules/auth/components/auth-page.tsx, password-input.tsx, account-menu.tsx, modules/auth/store/use-session-store.ts, modules/auth/lib/display-name.ts (+test), modules/auth/index.ts, components/shared/site-header.tsx, components/shared/mobile-menu.tsx, app/login/page.tsx | Phase 3 | A | AC10 | done |
| T12 | mis entradas | modules/account/components/my-tickets.tsx, modules/account/data/sample-orders.ts, modules/account/lib/split-orders.ts (+test), modules/account/index.ts, modules/purchase/types/order.ts, modules/purchase/lib/order.ts (+test), modules/purchase/store/use-order-store.ts, modules/purchase/index.ts, app/my-tickets/page.tsx | Phase 3 | A | AC11 | done |

Notas de implementación (Phase 4):
- Sesión simulada en memoria (`useSessionStore`): login usa el email (nombre derivado del email), registro pide nombre, email, contraseña (mín. 8) y términos. Tras enviar navega a `?redirect=` (solo rutas del mismo sitio) o a `/my-tickets`. Recargar cierra la sesión (sin persistencia).
- Header: sin sesión muestra "Iniciar sesión" / "Ingresar" (con `redirect` a la página actual); con sesión, "Mis entradas" + avatar con iniciales que abre un panel con nombre, email y "Cerrar sesión". `components/shared/site-header.tsx` consume `AccountMenu` desde `@/modules/auth` (API pública).
- `/my-tickets` no exige sesión (UI mock): une los 2 pedidos de ejemplo del diseño con los pagados en la sesión (`useOrderStore.orders`), separa Próximas/Pasadas por fecha y muestra cada entrada con su QR decorativo, zona/butaca, titular y código `TK-NNNNN-0N`.
- Cambio de contrato: `Order` suma `buyerName`, `event.startTime` y `items[].seats` (una butaca por entrada); `useOrderStore` guarda la lista `orders` (`useLastOrder`, `usePlacedOrders`).

### Phase 5 — Organizador
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T13 | layout del panel (sidebar/drawer) | modules/organizer/components/organizer-shell.tsx, components/shared/logo.tsx, app/organizer/layout.tsx | Phase 4 | A | AC12 | done |
| T14 | panel resumen + mis eventos | modules/organizer/components/organizer-dashboard.tsx, event-sales-sheet.tsx, sold-bar.tsx, modules/organizer/data/*, modules/organizer/lib/event-stats.ts (+test), modules/organizer/store/use-organizer-store.ts, modules/organizer/types/organizer-event.ts, app/organizer/page.tsx | T13 | B | AC12 | done |
| T15 | crear evento + vista previa | modules/organizer/components/event-form*.tsx, event-form-styles.ts, modules/organizer/lib/event-draft.ts (+test), modules/event/index.ts, modules/organizer/index.ts, app/organizer/events/new/page.tsx | T13 | B | AC12, AC13 | done |

Notas de implementación (Phase 5):
- Layout propio en `/organizer` (sin header/footer del sitio): sidebar fijo desde `lg` y barra superior con drawer en móvil. "Ventas" y "Configuración" se muestran deshabilitadas con la etiqueta "Pronto" (no existen aún). La cuenta abajo usa la sesión de `@/modules/auth` ("Organizador demo" sin sesión).
- Datos: los 4 eventos de ejemplo del diseño con tipos de entrada (`OrganizerEvent.tiers`); vendidas, capacidad e ingresos se derivan de los tipos (`lib/event-stats`). `useOrganizerStore` los guarda en memoria: recargar restaura los datos de ejemplo.
- Acción por fila: publicado → "Ver ventas" abre un panel con el detalle por tipo de entrada (y link a la página pública si el evento está en el catálogo); borrador → "Editar" abre el formulario en `/organizer/events/new?draft=<id>` con los datos cargados.
- Crear evento: "Publicar" valida con `required` nativo (nombre, fecha, hora, lugar, ciudad y cada tipo de entrada); "Guardar borrador" solo exige el nombre. Ambos guardan en el store y vuelven a `/organizer?saved=published|draft` con un aviso. Mínimo 1 tipo de entrada (el botón de quitar se deshabilita).
- La portada se previsualiza con un object URL local (clic o arrastrar; solo JPG/PNG); no se sube a ningún lado.
- Vista previa en vivo: replica la `EventCard` del catálogo (horizontal en móvil, vertical en escritorio) con placeholders; no es un link.
- Contratos nuevos: `OrganizerEvent`, `TicketTier`, `TierDraft`, `EventDraft` (`modules/organizer/types/organizer-event.ts`). `@/modules/event` ahora exporta `EVENT_CATEGORIES`.

## Decisions
- Landing incluida (Phase 1b), reemplaza la página del template.
- Rutas en inglés (SETUP §1).
- Test runner: Vitest.
- Fuente de verdad visual: Claude Design (2026-09-29). `docs/design-system.md` se reescribió con estos tokens (índigo, CTA naranja) y `specs/events/landing-page.md` queda superseded.

## Open questions
- (ninguna)
