# Rediseño de selección de entradas y mapa de butacas

- Module: purchase
- Status: done
- Approved by: noe12claude (2026-09-29)
- Mode: SDD

## Goal
Rediseñar la pantalla `/events/[id]/tickets` para que el flujo se entienda de un vistazo: hoy la zona se elige en dos lugares a la vez ("Elige tu zona" y la lista "Entradas"), las butacas aparecen como una grilla de cuadrados planos y en móvil la lista queda tapada por la barra del total. El objetivo es un solo recorrido **zona → butacas o cantidad → resumen**, con un mapa de butacas al nivel de las ticketeras de referencia.

## Problemas actuales
1. **Dos controles para lo mismo.** El mapa de zonas y la lista "Entradas" eligen zona por separado. La relación entre ambos no se ve, y el stepper de una zona general queda lejos del mapa.
2. **El mapa de butacas no da contexto.** Tiene solo cuadrados, sin curvatura ni forma de sala. No hay tooltip con fila, asiento y precio, y lo elegido no se ve fuera del mapa.
3. **Navegación confusa.** En escritorio el mapa de butacas aparece debajo del de zonas, sin "volver". En móvil se abre un sheet sin saber en qué paso estás.
4. **La barra fija tapa contenido.** En móvil, la barra "Total / Continuar" tapa filas de la lista.

## Referencias
- **Ticketmaster:**
  - Primero el mapa; al hacer clic en una sección, la vista hace zoom a sus butacas en el mismo lugar.
  - Panel lateral con las entradas disponibles de la sección.
  - Botón para elegir los mejores asientos disponibles según una cantidad.
- **seats.io** (motor de mapas de muchas ticketeras):
  - Butacas circulares coloreadas por categoría de precio y filas curvas en teatros.
  - Tooltip al pasar el cursor (sección · fila · asiento · precio) y check sobre las butacas elegidas.
  - Leyenda de categorías y minimapa al hacer zoom.
- **Eventbrite (reserved seating):** chips de categoría con precio que resaltan su zona en el mapa. Las butacas elegidas se listan como chips que se pueden quitar.
- **Teleticket / Joinnus** (mercado local): flujo por pasos (zona → butacas → resumen) con el resumen siempre visible.

## Scope
- In:
  - Rediseño de la tarjeta de selección (escritorio y móvil) y del mapa de butacas.
  - Geometría de filas curvas y "Mejores asientos disponibles".
  - Chips de butacas elegidas.
  - Arreglo de la barra fija en móvil.
- Out:
  - Cambios en checkout y confirmación.
  - Precios por butaca dentro de una misma zona.
  - Mapas reales de venues (seguimos con layouts mock).
  - Librerías comerciales (seats.io).

## Propuesta

### 1. Un solo panel "Elige tus entradas" con pasos
- Cabecera con migas: **Zonas › Platea**, y el botón "Todas las zonas" para volver.
- **Paso Zona** (estado inicial):
  - El mapa de zonas queda arriba. Las zonas muestran nombre y precio, y las agotadas se ven rayadas.
  - Debajo van las **tarjetas de zona**, que reemplazan la lista "Entradas". Cada una muestra color, nombre, precio y el tipo ("Numerada" o "General").
  - Cada tarjeta indica la disponibilidad: "Quedan pocas" o "Agotado".
  - Si la zona ya tiene entradas en la compra, la tarjeta lo muestra ("2 elegidas").
  - Pasar el cursor por una tarjeta resalta la zona en el mapa, y al revés.
- **Paso Butacas** (zona numerada):
  - El mapa hace una transición de zoom a las butacas de la zona, en el mismo contenedor.
  - Debajo aparecen los chips de las butacas elegidas, como "Fila D · 8", con una ×.
- **Paso Cantidad** (zona general): stepper grande con precio unitario, subtotal y el límite de 6 por zona. Sin mapa de butacas.
- El **resumen** ("Tu compra") no cambia en escritorio.

### 2. Mapa de butacas
- **Butacas:** círculos de 22px con el color de su zona.
  - Elegida: fondo índigo, con check o número.
  - Ocupada: gris con una ×.
  - Bloqueada por el límite: atenuada.
- **Sala:**
  - En teatro, las filas van en arco hacia un escenario curvo. En estadio (tribunas), las filas son rectas con pasillos.
  - Letras de fila a ambos lados.
- **Tooltip** al pasar el cursor o al enfocar con teclado: "Platea · Fila D · Asiento 8 · S/ 120". En táctil se muestra en la barra inferior.
- **Controles:** acercar, alejar y ver todo, más un minimapa cuando hay zoom (solo escritorio).
- **"Mejores disponibles":**
  - Se elige una cantidad (1–6) y la app selecciona ese número de butacas contiguas en la misma fila, lo más al frente y al centro posible.
  - Si no hay suficientes contiguas, completa con las más cercanas y lo avisa.
- **Accesibilidad:** se mantienen la navegación con flechas (roving tabindex), `role="checkbox"` y los anuncios con `aria-live`.
- **Librería:** seguimos con **SVG propio + `react-zoom-pan-pinch`**, la misma evaluación de la Fase 2:
  - seatmap-canvas pide React 18.
  - react-konva pide React ≥19.3.
  - seats.io es comercial.
  - La mejora está en la geometría y el render, no en cambiar de librería.

### 3. Móvil
- El paso Zona ocupa la pantalla con las tarjetas de zona a lo ancho.
- Al elegir una zona numerada se abre el mapa a pantalla completa. Arriba: migas y contador. Abajo: los chips, "Mejores disponibles" y "Listo".
- El contenido reserva el alto de la barra fija, así nada queda tapado.

## Acceptance criteria
- AC14 (flujo): la zona se elige en un solo lugar.
  - Hay mapa de zonas y tarjetas sincronizadas: hover y foco resaltan en ambos lados.
  - Elegir una zona numerada lleva al paso Butacas, y elegir una general, al paso Cantidad.
  - "Todas las zonas" vuelve al paso Zona sin perder lo elegido.
  - No existe más la lista "Entradas" separada.
- AC15 (mapa):
  - Las butacas son circulares, coloreadas por zona, y las filas son curvas en teatro.
  - Hay tooltip con zona, fila, asiento y precio, estados elegida, ocupada y bloqueada, y leyenda.
  - Las butacas elegidas aparecen como chips que se pueden quitar.
  - Se mantienen el zoom, el paneo y la navegación con teclado.
- AC16 (mejores disponibles): con una cantidad N, se eligen N butacas libres contiguas en la mejor fila disponible (delante primero, luego las más centradas). Si no alcanzan contiguas, se completa con las más cercanas y se muestra un aviso. Nunca se supera el límite por zona.
- AC17 (móvil): el mapa se abre a pantalla completa con migas, chips y "Listo". Ningún contenido queda detrás de la barra fija. No hay scroll horizontal a 390px.

## Reuse
- **Se reutiliza:**
  - `useEventCart`, `useCartStore`, `EventVenue` y los tipos de `ZoneTier`.
  - `react-zoom-pan-pinch`, `Sheet` y los tokens de zona (`lib/zone-style`).
- **Se extiende:**
  - `lib/seat-layout` agrega `curve` por layout y `r` por butaca.
  - `Seat` y `SeatSection` suman el centro `cx`/`cy`.
- **Nuevo:**
  - `lib/best-seats.ts` (con tests).
  - Componentes `zone-picker.tsx`, `seat-chips.tsx` y `ga-quantity.tsx`.
- **Se elimina:** `ticket-tier-list.tsx`, que queda reemplazado por las tarjetas de zona.

## Contratos
```ts
// types/venue.ts (cambios)
export interface VenueLayout { id: VenueLayoutId; stage: MapRect; zones: VenueZone[]; seatCurve?: number /* 0 = recto, 1 = arco completo */ }
export interface Seat { id: string; row: string; number: number; cx: number; cy: number; taken: boolean }

// lib/best-seats.ts
export function pickBestSeats(section: SeatSection, count: number, alreadySelected: string[]): { seatIds: string[]; contiguous: boolean };
```

## Plan
### Phase 6 — Selección de entradas
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T16 | geometría de butacas (filas curvas, centros) + mejores disponibles | modules/purchase/lib/seat-layout.ts, modules/purchase/lib/best-seats.ts (+test), modules/purchase/types/venue.ts, modules/purchase/data/venues.ts, modules/purchase/services/venue-service.ts, modules/purchase/store/use-cart-store.ts, modules/purchase/hooks/use-event-cart.ts | — | A | AC15, AC16 | done |
| T17 | mapa de butacas (círculos, tooltip, leyenda, minimapa, chips) | modules/purchase/components/seat-map.tsx, seat-chips.tsx | T16 | B | AC15, AC16 | done |
| T18 | panel unificado por pasos (zonas + tarjetas + cantidad) | modules/purchase/components/ticket-selection.tsx, zone-picker.tsx, zone-map.tsx, ga-quantity.tsx, ticket-tier-list.tsx (eliminar) | T16 | B | AC14 | done |
| T19 | móvil: mapa a pantalla completa y barra fija | modules/purchase/components/ticket-selection.tsx, order-summary.tsx | T17, T18 | C | AC17 | done |

## Decisions
- "Mejores disponibles" es una acción secundaria dentro del paso Butacas.
- Butaca elegida: fondo oscuro (`strong`) con check blanco, en vez de índigo. La Platea del teatro ya es índigo y una butaca elegida no se distinguiría de una libre (mismo criterio que seats.io).
- El tooltip muestra el precio de la zona (no hay precios por butaca).

## Notas de implementación (Phase 6)
- **Geometría (`lib/seat-layout`):**
  - Butacas de radio 11 y paso de 28px; pasillo cada 8 butacas.
  - En teatro (`seatCurve: 0.35`), las filas se proyectan sobre arcos concéntricos a un punto sobre el escenario.
  - Todo se encaja bajo una banda de escenario y `SeatSection` guarda `stage` y `rows[].start/end` para las letras.
- **`pickBestSeats`:**
  - Busca ventanas de N butacas libres adyacentes, fila por fila desde el frente, y elige la más centrada. Dos butacas son adyacentes si tienen número consecutivo y distancia de un paso; el pasillo corta la adyacencia.
  - Si no hay ninguna ventana, toma las N libres más cercanas a la mejor butaca disponible (`contiguous: false`).
  - El carrito suma `setSeats` para reemplazar la selección de la zona, limitada a 6.
- **Mapa:**
  - Círculos SVG del color de la zona. Las ocupadas se ven grises con ×, y las bloqueadas por el límite, atenuadas.
  - Hover con mouse o foco con teclado muestra un tooltip con zona, fila, asiento y precio.
  - Hay un minimapa cuando el zoom supera 1.15× el encuadre (solo escritorio).
- **Mapa de zonas (ajuste posterior, 2026-09-29):**
  - Pedido por el equipo: el escenario es una **media luna** y cada zona es un sector de anillo a su alrededor, como un anfiteatro. Reemplaza los rectángulos.
  - `VenueZone.arc` (radios y ángulos) reemplaza a `shape`, y `VenueLayout.stageRadius` reemplaza a `stage`. La geometría está en `lib/venue-geometry.ts`, con tests.
  - Detalles visuales: escenario con degradado, luces al borde y un resplandor suave. Las zonas llevan separación redondeada y la resaltada se eleva con un contorno.
  - Las etiquetas son HTML sobre el SVG para que se lean en móvil; las zonas con entradas elegidas muestran "✓ N".
  - El escenario del mapa de butacas también es media luna.
- **Mapa de butacas como zoom del recinto (ajuste posterior, 2026-09-29):**
  - Pedido por el equipo: el mapa de butacas no se correspondía con el de zonas, porque mostraba una grilla recta bajo un escenario genérico.
  - Ahora `buildSeatSection` genera las butacas desde el arco de la zona, con la misma escala para todo el recinto (`SEAT_MAP_SCALE`).
    - Las filas son arcos concéntricos alrededor del escenario, con la fila A al frente.
    - Las filas externas tienen más butacas y los pasillos son radiales, alineados entre filas.
    - `seating` (filas × butacas) desaparece de los datos.
  - El lienzo es el recinto completo: el escenario media luna en su posición real, las demás zonas tenues con su nombre y la zona elegida tintada con su contorno.
  - La vista abre encuadrada en las butacas de la zona (`focus`). En móvil, con zoom mínimo táctil, se centra en `anchor`, el punto medio del arco.
  - El botón "Encuadrar la zona" vuelve a ese encuadre, y el minimapa muestra dónde estás dentro del recinto.
  - Con ↑/↓ el teclado va a la butaca más cercana de la fila vecina.
- **Pasos:**
  - `ZonePicker` combina el mapa y las tarjetas de zona sincronizadas; el mapa muestra las zonas agotadas rayadas.
  - Una zona general abre `GaQuantity` en el mismo panel.
  - Una zona numerada abre el mapa en el panel (escritorio) o en un sheet a pantalla completa (móvil).
  - "Todas las zonas" vuelve al paso 1 sin perder lo elegido. `ticket-tier-list.tsx` se eliminó.

## Open questions
- (ninguna)
