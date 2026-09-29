# Landing page (UI con mock data)

- Module: events
- Status: superseded — reemplazada por `specs/shared/features-ui.md` (Phase 1b). La fuente de verdad visual es Claude Design (decisión del equipo, 2026-09-29).
- Approved by: lenadro291 (2026-09-28)
- Mode: SDD

## Goal
Construir la UI de la landing de Ticktera con datos mock, aplicando `docs/design-system.md` (solo modo claro, Poppins) y dejando piezas reutilizables (header, footer, EventCard, tokens) para las próximas páginas.

## Scope
- In: tokens de color/tipografía, layout global (header + footer), landing con hero carousel, categorías, tendencias, próximos eventos filtrables por categoría, CTA para organizadores, mock data de eventos.
- Out: página de detalle de evento, búsqueda funcional, autenticación, checkout, API real, TanStack Query, modo oscuro, i18n.

## Reuse
- Reuse: `components/ui/button.tsx`, `lib/utils.ts` (`cn`), `lucide-react`.
- Extend: `app/globals.css` (tokens de marca, se elimina el bloque `.dark`), `app/layout.tsx` (Poppins, `lang="es"`, header/footer), `next.config.ts` (`images.unsplash.com`).
- New (shadcn): `card`, `badge`, `input`, `carousel` (instala `embla-carousel-react`, reemplaza Swiper), `tabs`, `sheet`, `separator`.
- New (propio): módulo `events` y `components/shared/site-header|site-footer|logo` — no existe nada equivalente.

## Acceptance criteria
- AC1: Toda la app usa Poppins; no queda Geist.
- AC2: Colores salen de tokens en `globals.css` según `docs/design-system.md`; sin hex crudos en componentes; no hay modo oscuro.
- AC3: Header sticky con logo, input de búsqueda (visual), links de categorías y botón "Ingresar"; en mobile las categorías y la búsqueda van en un `Sheet`.
- AC4: Hero carousel con los eventos destacados: imagen full-bleed con overlay, título, fecha, lugar, precio desde y CTA "Comprar entradas"; controles prev/next accesibles.
- AC5: Grid de categorías con imagen que linkean a `/?category=<slug>#upcoming`.
- AC6: Carousel "Tendencias" con `EventCard`.
- AC7: Sección "Próximos eventos" con `Tabs` (Todos + cada categoría) que filtra el grid de `EventCard` en cliente.
- AC8: `EventCard` muestra imagen, categoría, fecha, título, lugar, "Desde S/ X" y badge "Últimas entradas" / "Agotado" según estado.
- AC9: Banner CTA para organizadores y footer con links.
- AC10: Imágenes remotas de Unsplash vía `next/image`; responsive sin scroll horizontal en 375–1440px.
- AC11: `npm run lint`, `npx tsc --noEmit` y `npm run build` pasan.

## Contracts

```ts
// modules/events/types/event.ts
export type EventCategory = "concerts" | "festivals" | "theater" | "sports" | "comedy" | "nightlife";
export type EventStatus = "available" | "few-left" | "sold-out";

export interface Event {
  id: string;
  slug: string;
  title: string;
  category: EventCategory;
  date: string;          // ISO 8601
  venue: string;
  city: string;
  imageUrl: string;
  priceFrom: number;     // PEN
  status: EventStatus;
  featured?: boolean;
}

// modules/events/services/event-service.ts  (mock hoy, API mañana: misma firma)
getEvents(): Promise<Event[]>
getFeaturedEvents(): Promise<Event[]>
getTrendingEvents(): Promise<Event[]>   // disponibles, no destacados, máx 8

// modules/events/constants/categories.ts
EVENT_CATEGORIES: CategoryInfo[]            // { slug, label, imageUrl }
CATEGORY_LABELS: Record<EventCategory, string>

// lib/format.ts
formatPrice(value: number): string      // "S/ 80"
formatEventDate(iso: string): string    // "sáb 15 nov · 20:00"

// modules/events/index.ts exporta: HeroCarousel, CategoryGrid, TrendingEvents,
// UpcomingEvents, OrganizerCta, EventCard, EVENT_CATEGORIES, CATEGORY_LABELS,
// getEvents, getFeaturedEvents, getTrendingEvents, tipos.

// components/shared/section.tsx — contenedor + heading de sección reutilizable
Section({ id?, title, description?, action?, className?, children })
```

## Edge cases
- Categoría sin eventos en Tabs → mensaje vacío "No hay eventos en esta categoría por ahora".
- Evento `sold-out` → badge "Agotado", precio atenuado.
- Títulos largos → `line-clamp-2`.

## Tests
- Ninguno en esta fase: es markup + wrappers de una línea sobre `Intl`. No se instala runner (SETUP §3: se configura con el primer test que aporte valor).

## Plan

### Phase 1 — Fundaciones
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: shadcn add card badge input carousel tabs sheet separator (fix lint upstream en carousel); tokens; Poppins; remote images | package.json, components/ui/*, app/globals.css, app/layout.tsx, next.config.ts, lib/format.ts | - | A | AC1, AC2, AC10 | done |
| T2 | tipos, categorías y mock data + service | modules/events/types/event.ts, modules/events/constants/categories.ts, modules/events/mocks/events.ts, modules/events/mocks/unsplash.ts, modules/events/services/event-service.ts | T1 | B | AC8 | done |
| T3 | header + footer + logo + search + section | components/shared/logo.tsx, components/shared/search-box.tsx, components/shared/section.tsx, components/shared/site-header.tsx, components/shared/site-footer.tsx | T1 | B | AC3, AC9 | done |

### Phase 2 — Landing
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T4 | EventCard | modules/events/components/event-card.tsx, event-status-badge.tsx | T2 | C | AC8 | done |
| T5 | hero + categorías + CTA | modules/events/components/hero-carousel.tsx, category-grid.tsx, organizer-cta.tsx | T2 | C | AC4, AC5, AC9 | done |
| T6 | tendencias + próximos eventos | modules/events/components/trending-events.tsx, upcoming-events.tsx | T4 | D | AC6, AC7 | done |
| T7 | index del módulo + page | modules/events/index.ts, app/page.tsx | T5, T6 | E | AC11 | done |

## Open questions
- Moneda asumida: soles (S/, `es-PE`) por la referencia a Joinnus. Cambiar si el mercado es otro.

## Implementation notes
- `UpcomingEvents` es Server Component: las cards se renderizan en servidor dentro de `TabsContent` (evita diferencias de `Intl` server/cliente). `key={category}` remonta Tabs al navegar desde el header.
- La fecha va como línea de meta con ícono (no bloque de fecha sobre la imagen).
- Links de cards/hero apuntan a `/events/<slug>` (página de detalle pendiente, hoy 404).
