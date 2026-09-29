# Design System — Ticktera

Fuente de verdad visual del proyecto: **Claude Design** ([Ticketera Landing Redesign](https://claude.ai/artifact/NmeqG8Dta7F7zcSPmbQC8y)), con pantallas de escritorio (1440px) y móvil (390px) para landing, búsqueda, detalle, selección de entradas, checkout, confirmación, login, mis entradas y panel de organizador. Cuando este documento y el diseño no coincidan, manda el diseño y se actualiza este documento. Reglas del proyecto: **solo modo claro** y **Poppins** como única fuente.

Implementación de referencia: `specs/shared/features-ui.md` (todas las fases en `done`).

## 1. Principios

1. **La imagen del evento es la protagonista.** La UI es neutra (blanco + zinc); el color se reserva para acciones y estado.
2. **Dos colores de acción con roles fijos.** Índigo = navegación y acciones de la app (links, botones primarios, selección). Naranja = **la acción de compra** ("Comprar entradas", "Continuar", "Pagar"): una por pantalla.
3. **Precio y fecha siempre visibles** en cada tarjeta ("Desde S/ 80"), sin costos escondidos.
4. **Móvil primero y táctil:** targets de 44px o más, acciones principales fijas abajo en los flujos de compra y creación.
5. **shadcn primero.** Toda pieza nueva parte de un componente de `components/ui/` (preset `base-nova` sobre `@base-ui/react`).

## 2. Color (tokens en `app/globals.css`)

| Token | Hex | Uso |
| ----- | --- | --- |
| `--primary` | `#4F46E5` (indigo-600) | Links, botones primarios, selección, barras de progreso |
| `--primary-foreground` | `#FFFFFF` | Texto sobre primary |
| `--accent` / `--accent-foreground` | `#EEF2FF` / `#3730A3` | Ítem activo del menú, fondos de énfasis suave |
| `--cta` / `--cta-hover` | `#F97316` / `#EA580C` | Botón de compra (naranja) |
| `--cta-foreground` | `#18181B` | Texto sobre el CTA (el blanco no llega a 4.5:1) |
| `--price` | `#C2410C` | Precios ("Desde S/ 80") |
| `--warning` / `--warning-foreground` | `#FFEDD5` / `#9A3412` | Badge "Últimas entradas", temporizador de checkout |
| `--stage` | `#1E1B4B` | Escenario del mapa de asientos |
| `--background` / `--card` | `#FFFFFF` | Fondo de página y tarjetas |
| `--canvas` | `#F4F4F5` | Fondo de flujos (compra, cuenta, panel) y muescas de las tarjetas |
| `--surface` | `#FAFAFA` | Bloques internos (resúmenes, tipos de entrada en móvil) |
| `--foreground` / `--strong` | `#18181B` | Texto principal; botón outline fuerte, badge "Agotado" |
| `--muted` / `--muted-foreground` | `#F4F4F5` / `#52525B` | Fondos neutros / texto secundario (7:1) |
| `--border` | `#E4E4E7` | Bordes de tarjetas |
| `--input` | `#D4D4D8` | Bordes de campos y botones outline |
| `--divider` | `#EEEEF0` | Separadores internos |
| `--ring` | `#818CF8` | Focus visible |
| `--destructive` | `#BE123C` | Errores |

Estados puntuales que no tienen token: "Publicado" usa `green-100`/`green-800` y los bordes punteados de subida y "Agregar" usan `indigo-300`/`indigo-700`.

Reglas:
- En componentes solo se usan clases de token (`bg-primary`, `text-price`, `bg-canvas`) o de la paleta de Tailwind cuando el diseño lo pide. No se escriben hex crudos, salvo el fondo `#F5F7FF` de la zona de subida.
- El texto sobre imagen lleva un overlay oscuro.

## 3. Tipografía

**Poppins** (`next/font`), pesos 400 / 500 / 600 / 700, única familia del proyecto.

| Rol | Móvil | Escritorio |
| --- | ----- | ---------- |
| H1 de página | `text-[26px]`–`text-[28px] font-bold tracking-tight` | `text-[32px]` |
| H2 de sección o tarjeta | `text-[17px]`–`text-lg font-semibold` | `text-lg`–`text-xl` |
| Título de tarjeta de evento | `text-[15px] font-semibold line-clamp-2` | `text-[17px]` |
| Body | `text-sm`–`text-[15px]` | `text-[15px]` |
| Meta (fecha, lugar) | `text-xs text-muted-foreground` | `text-sm` |
| Overline (categoría, "Vista previa") | `text-[11px]`–`text-xs font-semibold uppercase tracking-[0.06em]` | igual |
| Cifras (precios, KPIs) | `font-bold tabular-nums` | igual |

## 4. Espaciado, radios y sombras

- **Contenedor:**
  - Sitio: `mx-auto max-w-[1440px]` con `px-4` en móvil y `lg:px-20` en escritorio.
  - Panel de organizador: sidebar de 264px y contenido con `lg:px-12`.
- **Header:** `h-16` en móvil y `lg:h-[76px]` en escritorio, sticky, blanco, con borde `divider`.
- **Radios:**

  | Elemento | Móvil | Escritorio |
  | -------- | ----- | ---------- |
  | Tarjetas | 20px | 22–24px |
  | Campos (alto 52px) | 14px | 14px |
  | Botones | 12–14px | 12–14px |
  | Chips y badges | `rounded-full` | `rounded-full` |

- **Sombras:** las tarjetas son planas, con borde `border`. Al hover en escritorio, la tarjeta de evento sube 4px y gana `shadow-[0_20px_40px_-20px_rgba(24,24,27,.35)]`. La barra de acciones fija en móvil lleva una sombra superior suave.

## 5. Componentes

| Necesidad | Componente |
| --------- | ---------- |
| Acciones | `Button`, links con clases de botón. Primario índigo, CTA naranja (`bg-cta text-cta-foreground`), outline con `border-input` o `border-strong` |
| Campos | `Input`, `Textarea`, `Select` (base-ui), `Checkbox`, `RadioGroup`, altura 52px |
| Paneles y menú móvil | `Sheet` (a la derecha; en móvil, el de filtros ocupa la pantalla completa) |
| Filtros por estado | Segmentado con `aria-pressed` (fondo `muted` e ítem activo blanco con sombra) |
| Badges | `Badge` con `EventStatusBadge` ("Últimas entradas", "Agotado") y el estado del organizador |
| Marca | `components/shared/logo.tsx` (con `caption` opcional, por ejemplo "Organizadores") |
| Mapa de asientos | SVG propio con `react-zoom-pan-pinch` (`modules/purchase`) |

Íconos: `lucide-react`, 16–22px, con `aria-hidden` cuando son decorativos. Nunca emojis.

## 6. Patrones

**Tarjeta de evento (`EventCard`), con forma de entrada:**
- En móvil es horizontal: imagen de 108px, borde punteado vertical y muescas arriba y abajo.
- En escritorio es vertical: imagen de 176–180px, perforación punteada horizontal con muescas a los lados y pie con "Desde S/ X" y "Ver entradas".
- La insignia de fecha es blanca, con el mes índigo en mayúsculas y el día en negrita.
- Toda la tarjeta es un link.
- La vista previa de "Crear evento" replica esta tarjeta.

**Landing:** header (logo, navegación, "Iniciar sesión", "Vender entradas") → carrusel de 5 destacados → buscador → chips de categoría que filtran la grilla → newsletter → footer.

**Flujos de compra, cuenta y panel:**
- Fondo `canvas` con secciones en tarjetas blancas.
- En escritorio, el resumen o la vista previa va en una columna lateral sticky (340–400px).
- En móvil, la acción principal va en una barra fija abajo.

## 7. Movimiento

- Transiciones de 150–300ms, solo `transform`, `opacity` y `color`.
- **Carrusel de destacados:**
  - Autoplay de 6s con barra de progreso.
  - Botón de pausa y reproducción, y controles anterior y siguiente.
  - No arranca si hay `prefers-reduced-motion`.
- Respetar `motion-reduce:` en todas las transformaciones.

## 8. Accesibilidad (checklist de entrega)

- [ ] Contraste de texto de 4.5:1 o más (por eso el CTA naranja lleva texto oscuro).
- [ ] `alt` descriptivo en imágenes de eventos; `alt=""` en miniaturas decorativas.
- [ ] Focus visible con `outline: 3px solid #818CF8` y `offset 2px` en todo lo interactivo (regla global en `globals.css`).
- [ ] Botones de solo ícono con `aria-label` o `sr-only`.
- [ ] Targets táctiles de 44px o más en móvil.
- [ ] Responsive probado en 390 y 1440px sin scroll horizontal.
- [ ] Estados comunicados sin depender solo del color (texto en badges, `aria-pressed`, `aria-current`).
