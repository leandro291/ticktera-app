# Menú lateral unificado de los paneles (Administración + Organizador)

- Module: platform
- Status: done
- Approved by: lenadro291 (2026-10-05, respuesta "Aprobar y ejecutar")
- Mode: SDD

## Goal
Un solo menú lateral para todos los paneles (`/organizer`, `/super-admin` y el futuro `/admin`), según el diseño de Claude Design: dos secciones (Administración, Organizador) visibles según el rol, sidebar de 264px contraíble a riel de 76px en escritorio y drawer en móvil. Reemplaza los dos shells actuales por uno.

## Scope
- In:
  - `PanelShell` reescrito con el diseño: sidebar contraíble (≥ lg), barra superior con toggle y breadcrumb (≥ lg), barra superior móvil con hamburguesa, título y avatar, drawer izquierdo de 300px (`Sheet`), pie con "Ver sitio", "Cerrar sesión" y bloque de usuario (nombre real y rol en español).
  - Configuración de navegación como datos puros con `getNavSections(role)`, estado activo por `usePathname` y breadcrumb, con tests.
  - Un solo shell para `/organizer` y `/super-admin`: se borran `OrganizerShell` y `SuperAdminShell`. El shell recibe `role`, así que `/admin` lo usará sin cambios cuando exista.
  - `Logo` con modo solo icono (riel).
- Out:
  - Páginas de los ítems "Pronto" (Dashboard, Organizadores, Check-in, Pagos): se muestran deshabilitados, sin placeholders (YAGNI).
  - Panel `/admin`, link al panel en el header público.
  - Cambiar permisos, matriz o reglas del proxy (`ROLE_PERMISSIONS`, `ROUTE_RULES` no se tocan).
  - Tocar el contenido de las páginas (`UsersAdminPage`, `OrganizerDashboard`, `EventForm`).
  - Persistir el estado contraído (localStorage/Zustand): estado local, con `// ponytail:`.
  - El `h1` de la barra superior del diseño (ver D7).

## Decisiones (propuestas; el usuario no las discutió)
| #  | Decisión |
| -- | -------- |
| D1 | **Un solo shell.** `components/shared/panel-shell.tsx` se reescribe con el diseño y reemplaza a `modules/organizer/components/organizer-shell.tsx` y `modules/users/components/super-admin-shell.tsx` (se borran junto con sus exports). Los layouts siguen siendo Server Components: `requirePagePermission(...)` ya devuelve el `UserRow` y a `PanelShell` solo se le pasan `role` y `fullName` (nunca `clerkUserId` ni el `UserRow` entero). Los layouts importan `PanelShell` directo de `@/components/shared/panel-shell` (`app/` puede componer `shared`). |
| D2 | **Ítems sin página** se renderizan deshabilitados (`<span aria-disabled="true">`, sin `href`) con badge "Pronto", patrón actual del shell. Ítems con página: Usuarios → `/super-admin/users`, Resumen → `/organizer`, Mis eventos → `/organizer#my-events`, Crear evento → `/organizer/events/new`. |
| D3 | **Usuarios para `admin`.** `/super-admin/users` es solo `super_admin` (permiso `users:manage-roles`). Cada ítem puede declarar un `permission`; el ítem está habilitado solo si tiene `href` **y** `can(role, item.permission)`. Para `admin` el ítem Usuarios queda deshabilitado con "Pronto" (cuando exista la gestión de usuarios de `admin`, A3, se le dará su propio `href`). No se duplica la matriz: solo se llama a `can` de `modules/auth` (puro, client-safe). Misma idea a nivel sección: Administración exige `admin:panel`, Organizador exige `organizer:panel`. |
| D4 | **Estado activo por `usePathname`.** Cada ítem con `href` declara `match` (prefijo de ruta) y `exact?`. Gana el ítem habilitado con el `match` **más largo** que coincida (`pathname === match` o `pathname` empieza con `match + "/"`; con `exact` solo la igualdad). Así `/organizer/events/new` → Crear evento y `/organizer/events/xyz` → Mis eventos, y Resumen (`exact`, `/organizer`) no se activa en sub-rutas. **Ruta sin coincidencia** (p. ej. `/organizer/foo`, o un ítem deshabilitado): ningún ítem activo, sin `aria-current`, breadcrumb solo con "Panel" (sin sección ni separador) y el título móvil es "Panel". `Mis eventos` (`/organizer#my-events`) y Resumen comparten página: el hash no llega a `usePathname`, por lo que en `/organizer` el activo es Resumen. |
| D5 | **Config como datos puros** en `components/shared/panel-nav.ts` (no en `modules/auth`: auth es identidad y permisos, no UI). Los iconos se referencian por **clave** (`PanelIconKey`, un string); el shell cliente tiene un `Record<PanelIconKey, LucideIcon>` que resuelve el componente, así la config no importa React ni lucide, es testeable en Node y no hay funciones que cruzar la frontera server/client (el `Record` exhaustivo hace fallar `tsc` si falta un icono). |
| D6 | **Contraer = `useState` local** en el shell, solo escritorio (≥ lg). `// ponytail: estado local; persistir en localStorage si se pide recordar la preferencia`. En móvil el menú es un `Sheet` (`side="left"`) **controlado** (`open` en estado): se cierra con el botón cerrar, Esc, overlay o al elegir un ítem (`onClick` del link). |
| D7 | **Sin `h1` en el shell.** Las páginas ya traen su propio `h1` ("Resumen" en `OrganizerDashboard`, "Usuarios y roles" en `UsersAdminPage`); un `h1` en la barra superior duplicaría el encabezado y lo repetiría visualmente. La solución mínima: la barra superior solo lleva toggle + breadcrumb (escritorio) y el título como texto no-heading (móvil). Costo: el título del diseño no se repite como cabecera de página; cada página sigue con la suya. |
| D8 | **Tokens, sin hex.** Activo `bg-indigo-50 text-indigo-700` (coincide exacto con #EEF2FF/#4338CA; `--accent-foreground` del proyecto es indigo-800, no sirve para respetar el diseño), hover `hover:bg-muted`, texto `text-zinc-700`, bordes `border-border`/`border-divider`, foco `focus-visible:ring-2 ring-ring` (anillo del proyecto, no el outline del mockup), Poppins ya global. Fondo del contenido `bg-canvas` (el de hoy): el mockup usa slate-50 pero `UsersAdminPage` ya pinta su propio `bg-slate-50` y las páginas del organizador se diseñaron sobre canvas; cambiarlo sería tocar contenido. |
| D9 | **`Logo` gana `iconOnly`** (solo el cuadro con el ticket, con `aria-label="Ticketera"`, para el riel) y pierde `caption`: el único uso era el shell viejo. El tamaño del logo sigue siendo el del proyecto (32/38px), no los 36px del mockup. |
| D10 | **Nombre y rol del usuario vienen del servidor** (`fullName` de la BD y `role` del `UserRow`), no de `useUser()`: ya están en el layout, no hay parpadeo y es el dato autoritativo. Clerk solo aporta `SignOutButton`. Etiquetas de rol en español en `panel-nav.ts` (`ROLE_LABEL`); duplica 4 strings de `modules/users` (`ROLE_LABEL` interno): aceptado, subirlo a `modules/auth` es otra spec (regla 6 de SETUP §1 impide importar el interno). |
| D11 | **Ancho del drawer.** `SheetContent` trae `data-[side=left]:w-3/4` y `sm:max-w-sm`; una clase plana `w-[300px]` pierde por especificidad. Se debe pasar `data-[side=left]:w-[300px]` (el merge de `cn` la deduplica) y `showCloseButton={false}` (el diseño trae su propio botón cerrar dentro de la cabecera). El `Sheet` ya soporta `side="left"` y trae overlay, trampa de foco, Esc y devolución del foco al disparador (Base UI). |

## Reuse
Reference: system-design §2 (Autorización en dos capas, Matriz de acceso), `specs/platform/clerk-db-roles-and-seed.md` (D2 permisos derivados del rol, `can`, `requirePagePermission`), `specs/users/users-crud-design.md` (`/super-admin/users` solo `super_admin`, `UsersAdminPage` con su propia cabecera).
- Reuse: `modules/auth` (`can`, `Role`, `Permission`; client-safe) — decide qué secciones e ítems se habilitan sin duplicar la matriz.
- Reuse: `modules/auth/server` (`requirePagePermission` devuelve `UserRow`) — los layouts ya lo llaman; solo cambia lo que se pasa al shell.
- Reuse: `components/ui/sheet.tsx` (`Sheet`, `SheetTrigger`, `SheetContent side="left"`, `SheetTitle`, `SheetClose`) — drawer, ver D11.
- Reuse: `@clerk/nextjs` (`SignOutButton`, ya usado por el shell actual), `lucide-react`, `cn` de `@/lib/utils`, `next/link`, `usePathname`.
- Reuse: `hooks/use-media-query.ts` — **no** se usa: el ocultamiento escritorio/móvil es CSS (`hidden lg:flex` / `lg:hidden`) y el drawer solo monta su contenido abierto, sin duplicar IDs.
- Extend: `components/shared/logo.tsx` — agrega `iconOnly`, retira `caption` (D9).
- Extend: `app/organizer/layout.tsx`, `app/super-admin/layout.tsx` — usan `PanelShell` con `role` y `fullName`.
- Extend: `modules/organizer/index.ts`, `modules/users/index.ts` — se quita el export de los shells.
- Replace: `components/shared/panel-shell.tsx` (cliente) — se reescribe con el diseño; cambia su API (de `caption/links/accountFallback` a `role/fullName`). Único consumidor: los dos shells que se borran.
- Delete: `modules/organizer/components/organizer-shell.tsx`, `modules/users/components/super-admin-shell.tsx`.
- New: `components/shared/panel-nav.ts` (+ `.test.ts`) — config y lógica pura; nada equivalente existe (`site-nav.ts` es la navegación pública, otro dominio de datos; no hay forma de reusarla con permisos ni secciones).
- No instalar: dependencias nuevas ni componentes shadcn (no hace falta `tooltip`: el riel usa `title` nativo como el diseño).

## Acceptance criteria
Config y lógica pura
- AC1: `getNavSections(role)` devuelve solo las secciones visibles: Administración si `can(role, "admin:panel")`, Organizador si `can(role, "organizer:panel")`. `customer` → `[]`; `organizer` → solo Organizador; `admin` y `super_admin` → ambas, en ese orden (Administración primero).
- AC2: Ítems y orden de cada sección: Administración = Dashboard, Usuarios, Organizadores; Organizador = Resumen, Mis eventos, Crear evento, Check-in, Pagos. Un ítem está habilitado (`href` no nulo) solo si tiene `href` en la config y cumple su `permission` si lo declara. Con la config actual: habilitados Resumen, Mis eventos, Crear evento (cualquier rol con panel organizador) y Usuarios solo para `super_admin`; deshabilitados Dashboard, Organizadores, Check-in y Pagos para todos, y Usuarios para `admin`. Un ítem deshabilitado nunca expone `href` ni `match`.
- AC3: `getActiveNavItem(sections, pathname)` aplica D4: `/organizer` → Resumen; `/organizer/events/new` → Crear evento; `/organizer/events` y `/organizer/events/abc` → Mis eventos; `/super-admin/users` → Usuarios para `super_admin` y `null` para `admin`; `/organizer/foo`, `/organizerx` y `/` → `null`. `getPanelCrumb` devuelve `{ section, title }` del ítem activo o `{ section: null, title: "Panel" }`.
- AC4: `ROLE_LABEL` cubre los 4 roles en español (Super admin, Administrador, Organizador, Cliente).

Escritorio (≥ lg)
- AC5: Sidebar de 264px con logo "Ticketera", dos secciones con cabecera de texto, ítems con icono y etiqueta, pie con "Ver sitio" (link a `/`), "Cerrar sesión" (Clerk `SignOutButton`, `redirectUrl="/"`) y bloque de usuario con avatar, nombre real y rol en español. Barra superior de 64px con toggle y breadcrumb "Sección / Título" (solo "Panel" si no hay activo). El shell no renderiza ningún `h1`.
- AC6: El botón toggle tiene `aria-expanded` (`true` expandido, `false` contraído), `aria-controls` hacia el sidebar y `aria-label` "Contraer menú" / "Expandir menú". Al contraer, el sidebar pasa a 76px (con transición de ancho que respeta `motion-reduce`): se ocultan las etiquetas, el nombre del logo y el nombre/rol del usuario, las cabeceras de sección se reemplazan por un divisor y cada ítem, "Ver sitio" y "Cerrar sesión" llevan `title` con su texto. Las etiquetas ocultas siguen en el DOM como `sr-only`, así cada control conserva su nombre accesible en el riel.
- AC7: El ítem activo lleva `bg-indigo-50 text-indigo-700` y `aria-current="page"`; los demás no llevan `aria-current`. Los ítems deshabilitados son `aria-disabled="true"`, sin `href`, con badge "Pronto" (en el riel el badge se oculta y el `title` dice "<Etiqueta> · Pronto").

Móvil (< lg)
- AC8: Barra superior sticky de 60px con botón hamburguesa (`aria-label` "Abrir menú", `aria-expanded` según el drawer abierto), el título del ítem activo (o "Panel") como texto no-heading, y avatar. El sidebar de escritorio no se muestra.
- AC9: El drawer entra desde la izquierda (`Sheet side="left"`), de 300px (D11), con overlay, título accesible "Menú" (`SheetTitle`, `sr-only`), logo, botón "Cerrar menú" propio (`SheetClose`, 44px) y el mismo menú y pie que el escritorio, siempre expandido. Se cierra con el botón, Esc, clic en el overlay y al elegir un ítem habilitado. Al abrir, el foco entra al drawer y queda atrapado; al cerrar, vuelve a la hamburguesa.

Integración
- AC10: `/organizer` y `/super-admin/users` renderizan el mismo `PanelShell`, que recibe solo `role` y `fullName` (`grep clerkUserId` no aparece en `panel-shell.tsx` ni en los layouts); los guards `requirePagePermission("organizer:panel")` y `requirePagePermission("super-admin:panel")` siguen intactos y antes de renderizar el shell. Con `super_admin` en `/super-admin/users`: Usuarios activo, breadcrumb "Administración / Usuarios". Con `organizer` en `/organizer`: solo la sección Organizador, Resumen activo.
- AC11: `OrganizerShell`, `SuperAdminShell` y sus exports no existen (`grep -rn "OrganizerShell\|SuperAdminShell"` vacío). `Logo` ya no tiene `caption` y los demás usos (`site-header`, `site-footer`, `purchase-header`) no cambian.
- AC12: Accesibilidad y estilo: foco visible en todos los controles (anillo del proyecto); objetivos de 44px (`h-11` / `size-11`); iconos decorativos con `aria-hidden`; sin hex hardcodeados en los archivos nuevos o reescritos (`grep -E "#[0-9a-fA-F]{3,8}"` vacío); Poppins vía fuente global; los contenidos de las páginas no cambian.
- AC13: Al cierre de cada fase pasan `npm run lint`, `npx tsc --noEmit` y `npm test`, y la app sigue funcionando.

## Contracts

### Config y lógica pura (`components/shared/panel-nav.ts`, sin React)
```ts
import { can, type Permission, type Role } from "@/modules/auth"

export type PanelIconKey =
  | "dashboard" | "users" | "organizers"                       // Administración
  | "overview" | "events" | "create-event" | "check-in" | "payouts" // Organizador

/** Definición estática. Sin `href` = "Pronto". */
interface NavItemDef {
  id: string
  label: string
  icon: PanelIconKey
  href?: string
  match?: string          // prefijo para el estado activo (obligatorio si hay href)
  exact?: boolean         // solo igualdad (Resumen)
  permission?: Permission // además del de la sección (Usuarios: "users:manage-roles")
}
interface NavSectionDef { id: "admin" | "organizer"; label: string; permission: Permission; items: readonly NavItemDef[] }

/** Ítem resuelto para un rol. `href === null` => deshabilitado ("Pronto"); entonces `match` también es null. */
export interface NavItem { id: string; label: string; icon: PanelIconKey; href: string | null; match: string | null; exact: boolean }
export interface NavSection { id: "admin" | "organizer"; label: string; items: NavItem[] }

export const ROLE_LABEL: Record<Role, string> // Super admin | Administrador | Organizador | Cliente
export function getNavSections(role: Role): NavSection[] // AC1, AC2
export function getActiveNavItem(sections: NavSection[], pathname: string): { section: NavSection; item: NavItem } | null // AC3, D4
export function getPanelCrumb(sections: NavSection[], pathname: string): { section: string | null; title: string } // AC3
```
Config de partida (`NAV_SECTIONS`, no exportada):
- `admin` ("Administración", `admin:panel`): `dashboard` (sin href), `users` (`/super-admin/users`, match `/super-admin/users`, permission `users:manage-roles`), `organizers` (sin href).
- `organizer` ("Organizador", `organizer:panel`): `overview` (`/organizer`, match `/organizer`, `exact`), `events` (`/organizer#my-events`, match `/organizer/events`), `create-event` (`/organizer/events/new`, match `/organizer/events/new`), `check-in` y `payouts` (sin href).

### Shell (`components/shared/panel-shell.tsx`, `"use client"`)
```ts
import type { Role } from "@/modules/auth"
export function PanelShell(props: { role: Role; fullName: string; children: React.ReactNode }): JSX.Element
```
Interno (no exportado): `ICONS: Record<PanelIconKey, LucideIcon>`; `PanelNav({ sections, activeId, collapsed, onNavigate })`; `PanelFooter({ role, fullName, collapsed })`; estado `collapsed: boolean` (inicial `false`) y `mobileOpen: boolean`. Nombre mostrado: `fullName.trim() || ROLE_LABEL[role]`.

### Logo (`components/shared/logo.tsx`)
```ts
export function Logo(props: { className?: string; iconOnly?: boolean }): JSX.Element // se retira `caption`
```

### Layouts (Server Components)
```tsx
// app/organizer/layout.tsx
const user = await requirePagePermission("organizer:panel")
return <PanelShell role={user.role} fullName={user.fullName}>{children}</PanelShell>
// app/super-admin/layout.tsx: igual con requirePagePermission("super-admin:panel")
```
Si `user.role` (enum de Drizzle) no es asignable a `Role`, se resuelve con `parseRole(user.role)` de `modules/auth`, no con un cast.

## Edge cases
- **Rol sin acceso** (`customer`): los layouts ya redirigen antes de renderizar el shell (guard + proxy). Defensa en profundidad: `getNavSections("customer")` devuelve `[]` y el shell renderiza menú vacío, sin romper.
- **`admin` en `/organizer`**: ve ambas secciones (Usuarios "Pronto"); el soporte al organizador sigue permitido por la matriz.
- **Nombre ausente o solo espacios**: se muestra el rol en español en el lugar del nombre (D10); la columna es `NOT NULL` pero puede venir vacía.
- **Nombre largo**: `truncate` con `min-w-0`; el nombre completo va en `title` en el riel.
- **Ruta sin coincidencia** (D4): sin ítem activo, breadcrumb "Panel", título móvil "Panel". Un ítem deshabilitado nunca se activa aunque la ruta coincida con su `match` futuro (p. ej. `admin` en `/super-admin/users` no llega por el proxy, pero la regla igual aplica).
- **Riel y tooltips**: `title` nativo solo con el sidebar contraído (en expandido el texto ya se ve); el foco por teclado no muestra `title` (aceptado, el nombre accesible es el texto `sr-only`). En el riel los links mantienen el área de 44px (`h-11`) y quedan centrados.
- **Contraído y redimensionar**: el estado `collapsed` es independiente del ancho de ventana; bajo `lg` no tiene efecto y el sidebar está oculto. Al volver a `lg` se respeta el último estado.
- **Drawer abierto y ventana ≥ lg** (rotar tablet): el overlay quedaría hasta cerrarlo. Aceptado: raro y se cierra con Esc/overlay. `// ponytail: cerrar con useMediaQuery si molesta`.
- **Foco del drawer**: lo gestiona Base UI (entra al primer foco posible = botón cerrar, trampa, vuelve a la hamburguesa al cerrar). Al elegir un ítem, el drawer se cierra y el foco vuelve a la hamburguesa mientras navega Next; no se agrega manejo manual.
- **Mis eventos con hash**: `/organizer#my-events` desde `/organizer` hace scroll a la sección sin cambiar de pestaña activa (sigue Resumen, D4). Desde `/organizer/events/new` navega a `/organizer` y hace scroll; el activo pasa a Resumen.
- **Barra superior sticky y anclas**: `OrganizerDashboard` ya usa `scroll-mt-20` (80px) para el ancla; cubre la barra de 64/60px.
- **Cerrar sesión**: `SignOutButton` es un `<button>` hijo (no anidar `<button>` en `<button>`); mismo patrón del shell actual.
- **Hidratación**: la config y el rol vienen del servidor; `usePathname` y `useState` son consistentes en SSR (`collapsed` inicial `false`), sin `useMediaQuery`, así que no hay parpadeo escritorio/móvil.
- **Dos `nav` con el mismo nombre**: el sidebar de escritorio queda `display:none` bajo `lg` y el drawer solo monta abierto, por lo que nunca hay dos landmarks "Menú principal" visibles a la vez.

## Tests
Runner: Vitest ya configurado (`**/*.test.ts`, alias `@`). Sin tests de componentes (el `include` es solo `.ts` y SETUP §3 no pide testear markup); el shell se revisa a mano.
- `components/shared/panel-nav.test.ts` — AC1–AC4:
  - matriz rol × secciones visibles (`customer` `[]`, `organizer`, `admin`, `super_admin`) y orden de secciones;
  - ids de ítems por sección en orden, ids únicos en todo el menú;
  - matriz rol × habilitados: Resumen/Mis eventos/Crear evento habilitados con rol de panel; Usuarios habilitado solo para `super_admin` y deshabilitado (`href`/`match` nulos) para `admin`; Dashboard, Organizadores, Check-in y Pagos siempre deshabilitados;
  - `getActiveNavItem`: `/organizer`, `/organizer/events`, `/organizer/events/new`, `/organizer/events/abc`, `/super-admin/users` (super_admin y admin), `/organizer/foo`, `/organizerx`, `/`; empate por prefijo más largo; un ítem deshabilitado no se activa;
  - `getPanelCrumb`: con activo (`Organizador` / `Mis eventos`, `Administración` / `Usuarios`) y sin activo (`{ section: null, title: "Panel" }`);
  - `ROLE_LABEL` con los 4 roles.
- Verificación manual (sin test): escritorio 1280px y móvil 390px con `organizer`, `admin` y `super_admin`: contraer/expandir con teclado, tooltips del riel, abrir/cerrar drawer (Esc, overlay, ítem), foco al abrir y cerrar, `/organizer`, `/organizer/events/new`, `/super-admin/users`, sin doble `h1`.

## Plan

### Phase 1 — Config de navegación y `Logo` (sin cambio visible)
La app sigue igual: nada importa todavía `panel-nav.ts`; `Logo` mantiene `caption`.
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | `panel-nav.ts`: config, `getNavSections`, `getActiveNavItem`, `getPanelCrumb`, `ROLE_LABEL`, con tests | components/shared/panel-nav.ts, components/shared/panel-nav.test.ts | - | A | AC1, AC2, AC3, AC4 | done |
| T2 | setup: `Logo` agrega `iconOnly` (conserva `caption` hasta la Fase 2) | components/shared/logo.tsx | - | A | AC6 | done |

### Phase 2 — Shell unificado, layouts y limpieza (misma fase para que `tsc` no se rompa)
`tsc` pasa **al cierre de la fase**: T1 cambia la API de `PanelShell` mientras los shells viejos aún la usan hasta T3; el orden T1 → T2 → T3 deja el árbol compilable al final y los layouts nuevos antes de borrar los viejos.
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | Reescribir `PanelShell` (sidebar contraíble, barra superior, drawer, pie, iconos por clave) | components/shared/panel-shell.tsx | Phase 1 | A | AC5–AC9, AC12 | done |
| T2 | Layouts: usar `PanelShell` con `role` y `fullName` | app/organizer/layout.tsx, app/super-admin/layout.tsx | T1 | B | AC10 | done |
| T3 | Borrar `OrganizerShell` y `SuperAdminShell` y sus exports | modules/organizer/components/organizer-shell.tsx, modules/organizer/index.ts, modules/users/components/super-admin-shell.tsx, modules/users/index.ts | T2 | C | AC11 | done |
| T4 | `Logo`: retirar `caption` | components/shared/logo.tsx | T1 | B | AC11 | done |

Notas: T2 y T4 no comparten archivos y corren en paralelo (Group B). Verificación manual de la fase según *Tests* (3 roles × 2 anchos). `/admin` no se toca: cuando exista, su layout usará el mismo `PanelShell` con `requirePagePermission("admin:panel")`.

## Open questions
Ninguna bloquea el diseño; todas tienen default.
- Q1 (D3) Para `admin`, el ítem Usuarios aparece como "Pronto" aunque `super_admin` lo tiene activo (la gestión de usuarios para `admin` es A3, aún sin diseño). Alternativa: ocultarlo para `admin`. Default: deshabilitado con "Pronto", como en el diseño (que lo muestra a `admin`).
- Q2 (D7) El shell no repite el título como `h1` (cada página trae el suyo). Si se prefiere el `h1` del diseño, hay que quitarlo de `OrganizerDashboard`, `UsersAdminPage` y `EventForm`: toca contenido, otra spec.
- Q3 (D8) Fondo del contenido `bg-canvas` (hoy) en vez de slate-50 del mockup. Default: sin cambio para no alterar las páginas.
- Q4 (D10) `ROLE_LABEL` duplica las etiquetas de `modules/users`. Default: aceptado; unificarlo en `modules/auth` sería una spec aparte.
