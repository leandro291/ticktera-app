# Design System — Ticktera

Fuente de verdad visual del proyecto. Generado con `ui-ux-pro-max` (patrón *Marketplace / Directory* + *Event Landing*, dials: variance 5, motion 3, density 4) y ajustado a las reglas del proyecto: **solo modo claro** y **Poppins** como única fuente. Referencias: ticketmaster.com (jerarquía, búsqueda protagonista, carruseles) y joinnus.com (cards limpias, color de marca vibrante, categorías visuales).

## 1. Principios

1. **La imagen del evento es la protagonista.** La UI es neutra (blanco + slate); el color de marca se reserva para acciones.
2. **Un solo color de acción.** Violeta = "hacé click acá". El naranja solo comunica urgencia (pocas entradas, hoy). Nada más compite.
3. **Buscar primero.** La búsqueda está en el header y en el hero, como Ticketmaster.
4. **Precio y fecha siempre visibles** en cada card ("Desde S/ 80"), sin costos escondidos.
5. **shadcn primero.** Toda pieza nueva parte de un componente de `components/ui/`.

## 2. Color (tokens en `app/globals.css`)

| Token | Hex | Uso |
| ----- | --- | --- |
| `--primary` | `#7C3AED` (violet-600) | Botones primarios, links activos, focus ring |
| `--primary-foreground` | `#FFFFFF` | Texto sobre primary (contraste 5.7:1) |
| `--secondary` | `#F5F3FF` (violet-50) | Chips, botones secundarios, fondos de énfasis suave |
| `--secondary-foreground` | `#5B21B6` (violet-800) | Texto sobre secondary |
| `--background` | `#FFFFFF` | Fondo de página |
| `--foreground` | `#0F172A` (slate-900) | Texto principal |
| `--muted` | `#F8FAFC` (slate-50) | Secciones alternas, placeholders de imagen |
| `--muted-foreground` | `#475569` (slate-600) | Texto secundario (7.5:1) |
| `--accent` | `#F1F5F9` (slate-100) | Hover de ghost/outline (convención shadcn) |
| `--border` / `--input` | `#E2E8F0` (slate-200) | Bordes, inputs |
| `--ring` | `#7C3AED` | Focus visible |
| `--destructive` | `#DC2626` | Agotado, errores |
| `--highlight` | `#C2410C` (orange-700) | Urgencia: "Últimas entradas", "Hoy". Siempre como texto o badge suave (`bg-highlight/10`) |

Reglas: nunca hex crudo en componentes, solo clases de token (`bg-primary`, `text-muted-foreground`, `text-highlight`). Texto sobre imagen siempre con overlay `from-black/80` para garantizar 4.5:1.

## 3. Tipografía

- **Poppins** (Google Fonts vía `next/font`), pesos 400 / 500 / 600 / 700. Única familia del proyecto.

| Rol | Clases |
| --- | ------ |
| Display (hero) | `text-3xl md:text-5xl font-bold tracking-tight` |
| H2 sección | `text-2xl md:text-3xl font-semibold tracking-tight` |
| H3 card | `text-base font-semibold leading-snug line-clamp-2` |
| Body | `text-sm md:text-base` (min 14px en UI, 16px en párrafos) |
| Meta (fecha, lugar) | `text-sm text-muted-foreground` |
| Overline / labels | `text-xs font-medium uppercase tracking-wide` |

## 4. Espaciado, radios y sombras

- Contenedor: `mx-auto max-w-7xl px-4 md:px-6`.
- Ritmo vertical de secciones: `py-12 md:py-16`. Gap de grids: `gap-4 md:gap-6`.
- Radio base `--radius: 0.75rem` → cards `rounded-xl`, botones `rounded-lg`, chips `rounded-full`.
- Sombras: cards planas con `ring-1 ring-foreground/10` (default de shadcn Card); hover `shadow-lg` + imagen `scale-105`.

## 5. Componentes base (shadcn)

| Necesidad | Componente |
| --------- | ---------- |
| Acciones | `Button` (default, outline, ghost, secondary) |
| Card de evento | `Card` + `next/image` + `Badge` |
| Estado / categoría | `Badge` (`secondary` para categoría, `highlight` suave para urgencia) |
| Búsqueda | `Input` con ícono `Search` |
| Slides (hero, tendencias) | `Carousel` (Embla, sin autoplay) |
| Filtro por categoría | `Tabs` |
| Menú mobile | `Sheet` |
| Divisores | `Separator` |
| Sección con título | `components/shared/section.tsx` |

Íconos: `lucide-react` (ya instalado), tamaño 16–20px, nunca emojis.

## 6. Patrones de la landing

```
Header (logo · búsqueda · categorías · Ingresar)       sticky, blanco, borde inferior
Hero carousel (evento destacado full-bleed + CTA)      imagen + overlay, texto blanco
Categorías (tiles con imagen)                          grid 2→3→6 columnas
Tendencias (carousel de EventCard)                     1.2→2→4 cards visibles
Próximos eventos (Tabs por categoría + grid)           grid 1→2→4
CTA organizadores (banner violeta suave)
Footer (links, redes)
```

**EventCard:** imagen 16:10 con badge de categoría arriba-izquierda → fecha (violeta, uppercase, ícono) → título (2 líneas máx) → lugar y ciudad → "Desde S/ X" + badge de urgencia si aplica. Toda la card es un link.

## 7. Movimiento

- Transiciones 150–300ms `ease-out`, solo `transform`/`opacity`/`color`.
- Hover card: imagen `scale-105` (300ms). Sin animaciones de entrada por scroll en esta etapa.
- Carruseles sin autoplay (accesibilidad), con botones prev/next y flechas de teclado.
- Respetar `motion-reduce:` en transformaciones.

## 8. Accesibilidad (checklist de entrega)

- [ ] Contraste de texto ≥ 4.5:1 (tokens ya verificados).
- [ ] `alt` descriptivo en imágenes de eventos.
- [ ] Focus visible (ring violeta) en todo lo interactivo; no quitar outlines.
- [ ] Botones de solo ícono con `aria-label` / `sr-only`.
- [ ] Targets táctiles ≥ 44px en mobile.
- [ ] Responsive probado en 375, 768, 1024 y 1440px, sin scroll horizontal.
- [ ] `cursor-pointer` y estado hover en todo lo clickeable.
