# Panel de usuarios: diseño y CRUD completo

- Module: users
- Status: done
- Approved by: lenadro291 (2026-10-05, instrucción directa "ejecuta la spec cuando acabe")
- Mode: SDD

## Goal
Aplicar el diseño de Claude Design al panel `/super-admin/users` (lista con búsqueda, filtros y paginación; tarjetas en móvil) y completar el CRUD: invitar, editar nombre/rol/estado, suspender/reactivar y eliminar. Extiende `specs/platform/clerk-db-roles-and-seed.md` (done): reemplaza la UI de su Fase 4 y sus AC9–AC11 en lo que se indica en *Supersedes*.

## Scope
- In:
  - Lista: búsqueda por nombre/correo, filtro de rol, filtro de estado (solo organizadores), "Limpiar", estado vacío, resumen, rango, tamaño de página 8/16/24 (escritorio), paginación numerada con ventana de 5; móvil como tarjetas con Anterior/Siguiente (4 por página).
  - Aviso de éxito (`role="status"`, cerrable) tras cada acción.
  - Diálogos "Invitar usuario", "Editar usuario" y "¿Eliminar a X?" (alertdialog).
  - Dominio nuevo: `inviteUser`, `updateUser`, `deleteUser` con sus acciones, schemas, reglas puras y tests.
  - Toggle de estado (icono check) con `setUserStatusAction` existente.
  - Docs: `system-design.md` §2 "Panel de super admin" y la línea de `user.deleted` en `mer.md`.
- Out:
  - Variante `actor: admin` del diseño (A3): el selector de rol del diálogo ya ofrece Administrador porque el actor es siempre `super_admin`.
  - Estado "Pendiente" (sin migración; vuelve con A1).
  - Invitaciones reales de Clerk / envío de email (D4 de la spec vigente se mantiene: `createUser`).
  - Link al panel en el header.
  - Editar el correo, editarse a uno mismo, asignar `super_admin`.
  - Paginación o filtros del lado servidor, URL con search params, TanStack Table, Zustand.
  - Toggle de estado en las tarjetas móviles (el diseño móvil no lo trae; se suspende desde "Editar").

## Supersedes (spec `clerk-db-roles-and-seed`)
- AC10 (crear con email + nombre + rol): el diálogo ya no pide nombre; si el correo existe cambia el rol en vez de dar error de campo.
- AC11 (cambio de rol inline con `Select` en la tabla): el rol se cambia desde "Editar usuario".
- Fase 4 T2–T4 (UI): `users-table.tsx`, `create-staff-dialog.tsx` y `users-admin-page.tsx` se reemplazan. El resto de esa spec (sync, permisos, proxy, seed) no cambia.

## Decisiones (el usuario ya decidió 1–4; D5+ son propuestas del diseñador de la spec)
| #  | Decisión |
| -- | -------- |
| D1 | **Eliminar** (usuario): borra en BD y en Clerk solo si no hay datos asociados. Las únicas FK a `users.id` (sin cascade) son `events.organizer_id` y `orders.user_id` (`db/schema/events.ts`, `orders.ts`). Reglas: no a uno mismo, no a `super_admin`. |
| D2 | **Estado** = `users.status`: Aprobado = `active`, Suspendido = `suspended`. Sin Pendiente. El badge y los selectores de estado aplican solo a rol `organizer`. |
| D3 | **Acceso**: solo `super_admin`, permiso `users:manage-roles`. `super_admin` y uno mismo bloqueados (D8 de la spec vigente) con candado + motivo "Tu cuenta" / "Cuenta protegida". |
| D4 | **Invitar** = `createUser` de Clerk (D4 vigente). Si el correo ya existe en `users`: `changeUserRole` con las mismas reglas. El texto no promete email: la persona entra con Google o "Olvidé mi contraseña". |
| D5 | **Orden de borrado: una transacción de BD que envuelve la llamada a Clerk.** `db.transaction`: `DELETE FROM users WHERE id = $1` → `clerk.users.deleteUser(clerkUserId)` → commit. El chequeo de datos es la propia FK: si hay eventos u órdenes, Postgres lanza `23503` y no se llama a Clerk (atómico, sin carrera entre "contar" y "borrar", sin consultas extra). Si Clerk falla (que no sea 404), la excepción revierte el `DELETE`: no queda nada a medias y el reintento es limpio. Un 404 de Clerk (ya borrado) se trata como éxito, así que el reintento tras "Clerk borró pero el commit falló" también converge. Descartado: Clerk primero (si la BD falla, el usuario pierde acceso pero queda fila huérfana) y BD primero fuera de transacción (si Clerk falla el usuario sigue entrando y el sync perezoso lo recrea como `customer`). Costo: una conexión retenida durante una llamada HTTP, solo en una acción de super admin (baja frecuencia). |
| D6 | **Un solo `updateUserAction`** (nombre + rol + estado) en vez de componer `changeUserRoleAction` + `setUserStatusAction` + otra de nombre. Razón: el diálogo guarda todo con un botón; tres acciones desde el cliente serían 3 viajes, 3 revalidaciones y fallos parciales difíciles de explicar. Internamente reutiliza `checkRoleChange`/`checkStatusChange` (extendidas en `checkUserUpdate`) y `mirrorRoleToClerk`. **Orden: reglas → un solo `UPDATE` en BD (`full_name`, `role`, `status`) → Clerk** (`updateUser` nombre, `mirrorRoleToClerk`, `banUser`/`unbanUser` si aplica). **Reintento:** las llamadas a Clerk no se condicionan a "cambió en BD" (como en D5 vigente, sin corto-circuito): el diálogo queda abierto con el mismo formulario ante un error y reenviar repite las llamadas idempotentes. Costo: hasta 3 llamadas a Clerk por guardado (`// ponytail: sin diff contra Clerk; si molesta, comparar con el usuario de Clerk`). |
| D7 | **Sin bucle `user.updated` → sync.** Las llamadas de D6 disparan `user.updated`; `syncClerkUser` solo escribe email y nombre (nunca `role`/`status`, AC3/AC5 vigentes). El nombre ya está en BD antes de llamar a Clerk y se normaliza igual que `buildProfile` (`first` + resto como `last`, espacios colapsados), así que el eco es idempotente. Un webhook viejo que llegue tarde puede pisar el nombre con el anterior; el siguiente `user.updated` lo corrige (eventual, aceptado). |
| D8 | **Regla "organizador suspendido no cambia de rol".** Un organizador `suspended` no puede pasar a otro rol (error `suspended-organizer`: "Reactivá al organizador antes de cambiarle el rol."). Sin esto quedaría suspendido y sin indicador visible (el badge de estado es solo de organizadores). |
| D9 | **Invitar sin nombre.** El diseño pide solo correo + rol. `full_name` = parte local del correo (mismo fallback que `buildProfile`) y se edita luego en "Editar". Clerk se crea sin `firstName`. |
| D10 | **Filtrado y paginación del lado cliente.** `listUsers` ya trae todo y la lista es chica (decenas, no miles). Funciones puras en `lib/user-list.ts` con estado local `useState` (sin URL, sin Zustand). `@tanstack/react-table` queda sin usar: filtros + páginas son ~40 líneas puras y testeables; el hook de tabla sumaría definición de columnas y no resuelve responsive ni acciones. Techo: si la lista pasa de ~1000 filas, mover a servidor (`// ponytail:`). Tras una acción, `revalidatePath` refresca los props y el estado (filtros, página) se conserva. |
| D11 | **Responsive con un solo árbol de datos.** `UsersPanel` filtra una sola vez; `useMediaQuery("(min-width: 768px)")` (`hooks/use-media-query.ts`, ya existe) elige `UsersTable` (≥ md, `pageSize` 8/16/24) o `UserCards` (< md, `pageSize` 4). Durante SSR/hidratación el hook devuelve `false`, por lo que escritorio puede mostrar un instante la versión móvil (aceptado; alternativa CSS duplicaría el DOM). La página se acota con `paginate` al cambiar de tamaño de pantalla. |
| D12 | **Tokens, sin hex.** `app/globals.css` ya define Poppins (`--font-sans`), `--primary #4f46e5`, `--ring`, `--border`, `--input` y `--radius 0.75rem` (= 12px; `rounded-xl` ≈ 17px, `rounded-2xl` ≈ 22px se aceptan por 16/20). Los badges de rol/estado y el rojo de peligro usan la paleta de Tailwind, que coincide **exactamente** con el diseño: `violet-100/800` (#EDE9FE/#5B21B6), `indigo-50/800` (#EEF2FF/#3730A3), `amber-100/800` (#FEF3C7/#92400E), `gray-100/700` (#F3F4F6/#374151), `green-100/800` (#DCFCE7/#166534), `red-100/800` (#FEE2E2/#991B1B), `red-700`/`red-800` (#B91C1C/#991B1B), `slate-50` (#F8FAFC). Bordes y focus usan `border-input`/`border-border`/`ring` del proyecto (zinc, no gray: diferencia imperceptible). El destructive del proyecto (`#be123c`) no se usa en el botón Eliminar para respetar #B91C1C. Controles de 44px con `h-11`. Sin cambios en `globals.css`. |

## Reuse
Reference: system-design §2 (Rol: fuente de verdad y espejo, Autorización en dos capas, Panel de super admin), mer.md `users` (y línea 292, `user.deleted`).
- Reuse: `modules/users/lib/role-change-rules.ts` (`checkRoleChange`, `checkStatusChange`) — se conserva y se extiende con `checkUserUpdate` y `checkUserDelete`.
- Reuse: `modules/users/services/user-admin-service.ts` (`listUsers`, `findUser`, `changeUserRole`, `setUserStatus`, `UserAdminError`) — se extiende con `inviteUser`, `updateUser`, `deleteUser`; `createStaffUser` se reemplaza por `inviteUser` (misma compensación `deleteUser` de Clerk si falla la BD).
- Reuse: `modules/users/actions/user-admin-actions.ts` (`run`: permiso → Zod → servicio → `revalidatePath`, `setUserStatusAction`) — `run` pasa a devolver `{ ok: true; notice }`.
- Reuse: `modules/auth/server.ts` (`requirePermission`, `requirePagePermission`, `mirrorRoleToClerk`, `UserRow`) y `modules/auth` (`Role`, `ROLES`).
- Reuse: `components/ui/{button,input,label,select,badge,dialog,table}` ya instalados; `hooks/use-media-query.ts`; `cn` de `lib/utils`; `lucide-react` (iconos `UserPlus`, `Search`, `X`, `CircleCheck`, `Pencil`, `Trash2`, `Lock`, `ChevronLeft`, `ChevronRight`, `TriangleAlert`).
- Reuse: `lib/env`, `db`, `db/schema` sin cambios (cero migraciones).
- Reuse: Poppins y tokens de `app/globals.css` (D12).
- Extend: `modules/users/schemas/user-admin-schema.ts` — `inviteUserSchema`, `updateUserSchema`, `deleteUserSchema`; `setStatusSchema` queda. `createStaffSchema` y `changeRoleSchema` se retiran al final (Fase 4).
- Extend: `components/ui` — `npx shadcn@latest add alert-dialog` (existe `@shadcn/alert-dialog`; da `role="alertdialog"` y foco inicial en Cancelar). Es el único componente nuevo de shadcn.
- Replace: `modules/users/components/users-table.tsx` (reescribe: tabla de solo lectura + acciones por callbacks, sin `Select` inline), `modules/users/components/create-staff-dialog.tsx` (borrado, lo cubre `invite-user-dialog.tsx`), `modules/users/components/users-admin-page.tsx` (cabecera nueva y delega en `UsersPanel`).
- Keep: `modules/users/index.ts` (exporta solo `UsersAdminPage`), `app/super-admin/users/page.tsx` (delgada, sin cambios).
- New: `modules/users/lib/user-list.ts` (filtros/paginación puros), `lib/user-labels.ts`, `lib/db-errors.ts`, `types/user-list-item.ts`, `components/{users-panel,users-filters,users-pagination,user-cards,user-badges,user-row-actions,invite-user-dialog,edit-user-dialog,delete-user-dialog}.tsx` — nada equivalente existe en `components/shared` ni shadcn (paginación, avatar y badges por rol son específicos del dominio; no hay segundo uso para subirlos a shared, YAGNI).
- No instalar: dependencias nuevas (ninguna), `@tanstack/react-table` (D10).

## Acceptance criteria
Lista
- AC1: `/super-admin/users` muestra el resumen "N usuarios registrados" (N = total sin filtrar) y, por usuario, avatar con iniciales, nombre, correo, badge de rol, badge "Tú" en la propia cuenta, fecha de registro (`es`, medio) y acciones. En escritorio las columnas son Usuario, Rol, Organizador (estado), Registro, Acciones. Orden: más recientes primero (el de `listUsers`).
- AC2: Buscar filtra por nombre o correo sin distinguir mayúsculas ni acentos. El filtro de rol ofrece Todos + los 4 roles. El filtro de estado ofrece Todos / Aprobado / Suspendido y deja pasar **solo organizadores** con ese estado. "Limpiar" aparece solo si hay algún filtro activo y los resetea. Cualquier cambio de filtro o de tamaño de página vuelve a la página 1.
- AC3: Sin coincidencias se muestra "Sin resultados" / "Ningún usuario coincide con los filtros." con botón "Limpiar filtros" (desktop y móvil). El rango dice "0 resultados".
- AC4: Escritorio (≥ md): tabla; selector "Filas" 8/16/24 (por defecto 8); texto "Mostrando a–b de N"; paginación numerada con ventana de hasta 5 páginas, `aria-current="page"` en la actual, botones "Página anterior"/"Página siguiente" deshabilitados en los extremos. Móvil (< md): tarjetas, 4 por página, botones "Anterior"/"Siguiente" y texto "Página X de Y". Ambas presentaciones usan la misma lista filtrada y los mismos diálogos.
- AC5: El badge de estado (Aprobado/Suspendido) se muestra solo para organizadores; los demás roles no muestran estado. Colores de rol y estado según D12.
- AC6: Las filas de la propia cuenta y de un `super_admin` no tienen botones de acción: muestran candado + "Tu cuenta" / "Cuenta protegida". El servidor igualmente rechaza (AC15).
- AC7: Tras cada acción exitosa aparece un aviso `role="status"` con el texto del servidor (`notice`) y botón "Cerrar aviso"; el diálogo se cierra, la lista se refresca y los filtros y la página se conservan. Un nuevo aviso reemplaza al anterior.

Invitar
- AC8: "Invitar usuario" (correo + rol Organizador | Administrador, por defecto Organizador). Texto del diálogo: "Si el correo ya tiene cuenta, se cambia su rol. Si no, se crea la cuenta y la persona entra con Google o con «Olvidé mi contraseña»." Botón "Invitar" (sin promesa de email). Correo nuevo → crea el usuario en Clerk (`publicMetadata.role`) y la fila en `users` (`full_name` = parte local del correo, D9); si falla la BD se borra el usuario de Clerk. Aviso: "Cuenta creada para {correo}."
- AC9: Correo ya existente en `users` → se cambia el rol con `changeUserRole` (BD y luego espejo en Clerk; sin llamar a `createUser`). Rechaza: el propio usuario, un `super_admin` y asignar `super_admin`; el error se muestra en el diálogo (`role="alert"`). Aviso: "Rol actualizado para {correo}."
- AC9b: Un correo inválido muestra el error de campo bajo el input (Zod). Un rechazo de Clerk (p. ej. correo ya registrado en Clerk pero no en `users`) se muestra bajo el correo con el mensaje de Clerk y no deja fila.

Editar
- AC10: "Editar usuario": Nombre (editable, 2–120 caracteres, espacios colapsados), Correo deshabilitado con el texto "El correo viene de la cuenta de Google y no se edita.", Rol (Cliente | Organizador | Administrador), y "Estado de organizador" (Aprobado | Suspendido) visible solo si el rol del formulario es Organizador. "Guardar cambios" ejecuta `updateUserAction` y actualiza `users.full_name`, `role` y, si el rol es organizador, `status`, en un solo `UPDATE`; luego Clerk: `firstName`/`lastName`, `publicMetadata.role` y `banUser`/`unbanUser` si el estado aplica. Aviso: "Cambios guardados."
- AC11: Si Clerk falla, la acción devuelve error, la BD queda actualizada, el diálogo sigue abierto con el formulario y reenviar repite las llamadas a Clerk (idempotentes, D6). `user.updated` no pisa `role` ni `status` (D7).
- AC12: Un organizador `suspended` no puede cambiar de rol (D8): error "Reactivá al organizador antes de cambiarle el rol." Si el rol resultante no es organizador, `status` del payload se ignora y el de la fila no cambia.

Estado y eliminar
- AC13: El botón check (solo organizadores) alterna `active` ↔ `suspended` con `setUserStatusAction` (BD y luego `banUser`/`unbanUser`). `aria-label`: "Suspender a {nombre}" / "Aprobar a {nombre}". Aviso: "{nombre} fue suspendido." / "{nombre} fue aprobado."
- AC14: "Eliminar" abre un `AlertDialog` (`role="alertdialog"`) con el título "¿Eliminar a {nombre}?" y el texto "Perderá el acceso a Ticketera. Esta acción no se puede deshacer.", botones "Cancelar" (foco inicial) y "Eliminar" (rojo). Confirmar ejecuta `deleteUserAction`: transacción de BD con `DELETE` + `deleteUser` de Clerk (D5). Aviso: "{nombre} fue eliminado."
- AC15: Si el usuario tiene eventos u órdenes (FK `23503`) la acción falla con "Tiene eventos u órdenes asociados, por eso no se puede eliminar. Si es organizador, suspendelo en su lugar.", la fila sigue en BD y **no se llama a Clerk**. El mensaje se muestra dentro del diálogo, que queda abierto. Si Clerk falla, la transacción revierte y la fila sigue. Un 404 de Clerk cuenta como éxito.

Seguridad y reglas
- AC16: Todas las acciones (`inviteUserAction`, `updateUserAction`, `setUserStatusAction`, `deleteUserAction`) llaman `requirePermission("users:manage-roles")` y validan con Zod antes de tocar BD o Clerk. Rechazan en el servidor: actuar sobre uno mismo, sobre un `super_admin` y asignar `super_admin` (`checkUserUpdate`, `checkUserDelete`, `checkStatusChange`).

Accesibilidad y estilo
- AC17: Foco visible (anillo del proyecto) en todos los controles; cada input/select con `Label` (en móvil el de búsqueda y los filtros son `sr-only`); botones de icono con `aria-label` ("Editar a {nombre}", "Eliminar a {nombre}", toggle según AC13, "Cerrar aviso", "Página anterior", "Página siguiente", "Página N"); los iconos decorativos llevan `aria-hidden`; objetivos táctiles de 44px (`h-11`/`size-11`); los errores de campo con `aria-invalid` + `aria-describedby`.
- AC18: Sin hex hardcodeados en los componentes nuevos (`grep -E "#[0-9a-fA-F]{3,8}" modules/users/components` vacío); badges, rojo y fondo según D12; Poppins vía fuente global; shadcn `Dialog`, `AlertDialog`, `Select`, `Input`, `Button`, `Table`.

Docs y calidad
- AC19: `system-design.md` §2 "Panel de super admin" refleja invitar (con cambio de rol si existe), editar, suspender, eliminar (D5), búsqueda/filtros/paginación; `mer.md` aclara que `user.deleted` (webhook) suspende y que el borrado desde el panel elimina la fila solo sin datos asociados.
- AC20: Al cierre de cada fase pasan `npm run lint`, `npx tsc --noEmit` y `npm test`, y la app funciona. Al cierre de la Fase 4 no quedan `createStaffUser*`, `createStaffSchema`, `changeUserRoleAction` ni `changeRoleSchema` (`grep` vacío) ni `create-staff-dialog.tsx`.

## Contracts

### Tipo de fila de la lista (cliente, sin `clerkUserId`)
```ts
// modules/users/types/user-list-item.ts
import type { UserRow } from "@/modules/auth/server" // type-only
export type UserListItem = Pick<UserRow, "id" | "email" | "fullName" | "role" | "status" | "createdAt">
```

### Schemas (`modules/users/schemas/user-admin-schema.ts`)
```ts
const lower = (e: string) => e.toLowerCase()
const fullNameField = z.string().trim().min(2).max(120).transform((s) => s.replace(/\s+/g, " "))

export const inviteUserSchema = z.object({ email: z.email().transform(lower), role: z.enum(["admin", "organizer"]) })
export const updateUserSchema = z.object({
  userId: z.uuid(),
  fullName: fullNameField,
  role: z.enum(["admin", "organizer", "customer"]),
  status: z.enum(["active", "suspended"]).optional(), // solo se aplica si role === "organizer"
})
export const deleteUserSchema = z.object({ userId: z.uuid() })
// setStatusSchema sin cambios. createStaffSchema y changeRoleSchema: se retiran en la Fase 4.
```

### Reglas puras (`modules/users/lib/role-change-rules.ts`)
```ts
export type UserUpdateResult = { ok: true } | { ok: false; reason: "self" | "target-super-admin" | "invalid-role" | "suspended-organizer" }
export function checkUserUpdate(actor: { id: string }, target: { id: string; role: Role; status: "active" | "suspended" }, next: { role: Role }): UserUpdateResult
// = checkRoleChange(...) y luego: target.role === "organizer" && target.status === "suspended" && next.role !== "organizer" -> "suspended-organizer"
export type UserDeleteResult = { ok: true } | { ok: false; reason: "self" | "target-super-admin" }
export function checkUserDelete(actor: { id: string }, target: { id: string; role: Role }): UserDeleteResult
```

### Error de BD (`modules/users/lib/db-errors.ts`)
```ts
// Recorre `error.cause` (DrizzleQueryError envuelve el error de pg): true si algún eslabón tiene code === "23503".
export function isForeignKeyViolation(error: unknown): boolean
```

### Servicio (`modules/users/services/user-admin-service.ts`)
```ts
export type UserAdminErrorCode = "clerk-rejected" | "not-found" | "self" | "target-super-admin" | "invalid-role" | "suspended-organizer" | "has-data"
// "email-taken" se retira (invitar a un correo existente ya no es error).
export async function inviteUser(actor: { id: string }, input: { email: string; role: "admin" | "organizer" }): Promise<{ user: UserRow; outcome: "created" | "role-updated" }>
export async function updateUser(actor: { id: string }, input: { userId: string; fullName: string; role: Role; status?: "active" | "suspended" }): Promise<UserRow>
export async function deleteUser(actor: { id: string }, input: { userId: string }): Promise<UserRow> // devuelve la fila borrada
// listUsers, changeUserRole, setUserStatus: sin cambios de contrato.
```
`updateUser`: `findUser` → `checkUserUpdate` → `UPDATE` (status solo si `role === "organizer" && input.status`) → `client.users.updateUser(clerkUserId, { firstName, lastName })` (`lastName` vacío cuando el nombre es una sola palabra: verificar en `@clerk/backend` si acepta `""` o `null`) → `mirrorRoleToClerk` → `banUser`/`unbanUser` si `role === "organizer" && input.status`.
`deleteUser`: `findUser` → `checkUserDelete` → `db.transaction(async (tx) => { await tx.delete(users).where(eq(users.id, target.id)); try { await clerk.users.deleteUser(target.clerkUserId) } catch (e) { if (!isClerk404(e)) throw e } })`; un `isForeignKeyViolation` → `UserAdminError("has-data")`.
`inviteUser` con correo existente: `changeUserRole(actor, { userId: existing.id, role })`, `outcome: "role-updated"`.

### Acciones (`modules/users/actions/user-admin-actions.ts`, `"use server"`)
```ts
export type ActionResult =
  | { ok: true; notice: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }
export async function inviteUserAction(input: unknown): Promise<ActionResult>
export async function updateUserAction(input: unknown): Promise<ActionResult>
export async function setUserStatusAction(input: unknown): Promise<ActionResult> // existente
export async function deleteUserAction(input: unknown): Promise<ActionResult>
```
`run(schema, input, fn)`: `fn` devuelve el `notice` (string). Mensajes de error nuevos: `has-data` (AC15), `suspended-organizer` (AC12). `clerk-rejected` sigue como `fieldErrors.email` solo en `inviteUserAction`. Todas hacen `revalidatePath("/super-admin/users")`.

### Lib de la lista (`modules/users/lib/user-list.ts`, puro)
```ts
export type UserListFilters = { q: string; role: Role | "all"; status: "all" | "active" | "suspended" }
export const EMPTY_FILTERS: UserListFilters
export const PAGE_SIZES = [8, 16, 24] as const
export const MOBILE_PAGE_SIZE = 4
export function hasActiveFilters(f: UserListFilters): boolean
export function filterUsers(users: UserListItem[], f: UserListFilters): UserListItem[] // AC2
export function paginate<T>(items: T[], page: number, pageSize: number): { items: T[]; page: number; pageCount: number; total: number; from: number; to: number } // page acotada a [1, pageCount]; from/to 1-based, 0 si vacío; pageCount >= 1
export function pageWindow(page: number, pageCount: number, size = 5): number[] // first = max(1, min(page - 2, pageCount - size + 1)), hasta first + size - 1 sin pasar de pageCount
export function initials(name: string): string // primera letra de las dos primeras palabras; una palabra: sus 2 primeras letras; mayúsculas
export function getLockReason(user: Pick<UserListItem, "id" | "role">, currentUserId: string): "Tu cuenta" | "Cuenta protegida" | null // self gana sobre super_admin
```
```ts
// modules/users/lib/user-labels.ts
export const ROLE_LABEL: Record<Role, string> // Super admin | Administrador | Organizador | Cliente
export const ORGANIZER_STATUS_LABEL: Record<"active" | "suspended", string> // Aprobado | Suspendido
export const INVITE_ROLES: readonly ("organizer" | "admin")[]   // orden de las opciones del diálogo
export const EDIT_ROLES: readonly ("customer" | "organizer" | "admin")[]
```

### Componentes (`modules/users/components/`)
```ts
// "use client" salvo indicación
UsersAdminPage()                                  // server: permiso, listUsers → UserListItem[], <UsersPanel/>; fondo bg-slate-50 de ancho completo
UsersPanel(props: { users: UserListItem[]; currentUserId: string })   // estado: filters, page, pageSize, notice, dialog; elige tabla/tarjetas (D11)
UsersFilters(props: { filters: UserListFilters; onChange: (f: UserListFilters) => void; onClear: () => void })
UsersTable(props: { users: UserListItem[]; currentUserId: string; onToggle: (u) => void; onEdit: (u) => void; onDelete: (u) => void; pendingId?: string })
UserCards(props: same as UsersTable)
UsersPagination(props: { variant: "numbered" | "simple"; page: number; pageCount: number; onPageChange: (p: number) => void })
RoleBadge(props: { role: Role }), StatusBadge(props: { status: "active" | "suspended" }), UserAvatar(props: { name: string })   // user-badges.tsx
UserRowActions(props: { user: UserListItem; currentUserId: string; variant: "icons" | "compact"; onToggle; onEdit; onDelete; pendingId? })   // candado si getLockReason
InviteUserDialog(props: { open: boolean; onOpenChange: (o: boolean) => void; onDone: (notice: string) => void })
EditUserDialog(props: { user: UserListItem | null; onOpenChange: (o: boolean) => void; onDone: (notice: string) => void })   // montar con key={user.id}
DeleteUserDialog(props: { user: UserListItem | null; onOpenChange: (o: boolean) => void; onDone: (notice: string) => void })
```
`modules/users/index.ts` sigue exportando solo `UsersAdminPage`.

## Edge cases
- Eliminar usuario con eventos u órdenes: `23503` revierte la transacción, Clerk no se toca (AC15). Un cliente con órdenes no puede borrarse ni suspenderse desde la UI (el estado es solo de organizadores, D2): el mensaje cubre ambos casos y el super admin puede cambiarle el rol a organizador para suspenderlo si hace falta.
- Un usuario borrado en Clerk por fuera del panel (`user.deleted`) queda `suspended` y sin indicador visible si no es organizador. Se resuelve con "Eliminar" (404 de Clerk = éxito) cuando no tiene datos.
- Eliminar dispara el webhook `user.deleted` → `suspendClerkUser` hace `UPDATE ... WHERE clerk_user_id` sobre una fila ya borrada o bloqueada por la transacción: no-op; no hay resurrección.
- Eliminar a alguien con sesión vigente: la fila ya no existe, `getCurrentUser()` haría sync perezoso y lo recrearía como `customer` si el token sigue válido. Como Clerk lo borró, su sesión deja de ser válida; no se agrega nada más.
- Nombre de una sola palabra en "Editar": `lastName` queda vacío en Clerk y el nombre en BD es esa palabra (eco del webhook idéntico).
- Editar nombre con el mismo valor y rol: igual repite las llamadas a Clerk (D6), idempotentes.
- Invitar al propio correo del super admin o a otro `super_admin`: error de reglas (`self` / `target-super-admin`) en el diálogo, sin llamar a Clerk.
- Invitar un correo en mayúsculas: Zod lo normaliza a minúsculas, la búsqueda de existente es por el valor normalizado.
- Filtro de estado activo + filtro de rol distinto de Organizador/Todos → lista vacía (por diseño: el estado es solo de organizadores).
- Tras eliminar el último elemento de la última página, `paginate` acota la página y no queda una página vacía.
- Cambio de tamaño de ventana de escritorio a móvil con página alta: `paginate` la acota con `pageSize` 4.
- El aviso persiste hasta cerrarlo o hasta la siguiente acción; no se auto-oculta.
- Dos pestañas del super admin: la segunda acción sobre un usuario ya eliminado devuelve `not-found` ("El usuario no existe.").

## Tests
Runner: Vitest ya configurado (`**/*.test.ts`). Sin tests de componentes (el `include` es solo `.ts`, y SETUP §3 no pide testear markup) ni de BD/Clerk; el flujo se cubre con las reglas puras + revisión.
- `modules/users/lib/user-list.test.ts` — AC1–AC6:
  - `filterUsers`: nombre y correo, mayúsculas y acentos ("lucia" encuentra "Lucía"), rol, estado solo organizadores (cliente suspendido no pasa con `status: "suspended"`), combinación, `EMPTY_FILTERS` devuelve todos, `hasActiveFilters`.
  - `paginate`: 24 filas × 8 → 3 páginas, rango 1–8; última página parcial; página fuera de rango acotada; vacío → `from = to = 0`, `pageCount = 1`; `pageSize` 4.
  - `pageWindow`: 3 páginas → `[1,2,3]`; 10 páginas con página 1 → `[1..5]`, página 5 → `[3..7]`, página 10 → `[6..10]`.
  - `initials`: "Carla Rojas" → "CR", "Ana" → "AN", espacios extra, minúsculas.
  - `getLockReason`: self, `super_admin`, self que además es `super_admin` ("Tu cuenta"), otro usuario → `null`.
- `modules/users/lib/role-change-rules.test.ts` (extiende el existente) — AC12, AC16: `checkUserUpdate`: self, super_admin, rol `super_admin`, `suspended-organizer` (organizador suspendido a customer), organizador suspendido que sigue organizador → ok, organizador activo a customer → ok, customer suspendido a organizer → ok; `checkUserDelete`: self, super_admin, ok.
- `modules/users/lib/db-errors.test.ts` — AC15: error plano con `code: "23503"`, `cause` anidado (DrizzleQueryError simulado), otro código `23505`, no-error (`null`, string).
- `modules/users/schemas/user-admin-schema.test.ts` (extiende el existente) — AC8, AC10, AC16: `inviteUserSchema` (email inválido, normaliza a minúsculas, rechaza `customer` y `super_admin`), `updateUserSchema` (nombre corto, nombre con espacios múltiples colapsa, `userId` no uuid, `status` opcional e inválido), `deleteUserSchema`. Se retiran los casos de `createStaffSchema`/`changeRoleSchema` en la Fase 4.

## Plan

### Phase 1 — Dominio: invitar, editar y eliminar (sin UI nueva)
La UI actual sigue compilando: `createStaffUser`, `createStaffSchema`, `changeUserRoleAction` y `changeRoleSchema` se conservan hasta la Fase 4. `ActionResult` gana `notice` (los helpers legacy devuelven uno).
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | Schemas `inviteUserSchema`, `updateUserSchema`, `deleteUserSchema`, con tests | modules/users/schemas/user-admin-schema.ts, modules/users/schemas/user-admin-schema.test.ts | - | A | AC8, AC10, AC16 | done |
| T2 | Reglas puras `checkUserUpdate`, `checkUserDelete`, con tests | modules/users/lib/role-change-rules.ts, modules/users/lib/role-change-rules.test.ts | - | A | AC12, AC16 | done |
| T3 | `isForeignKeyViolation`, con tests | modules/users/lib/db-errors.ts, modules/users/lib/db-errors.test.ts | - | A | AC15 | done |
| T4 | Servicio: `inviteUser`, `updateUser`, `deleteUser` (transacción + 404 de Clerk), códigos de error `has-data` y `suspended-organizer` | modules/users/services/user-admin-service.ts | T2, T3 | B | AC8, AC9, AC10, AC11, AC12, AC14, AC15, AC16 | done |
| T5 | Acciones `inviteUserAction`, `updateUserAction`, `deleteUserAction`; `run` con `notice`; mensajes de error nuevos | modules/users/actions/user-admin-actions.ts | T1, T4 | C | AC7, AC9, AC13, AC15, AC16 | done |

### Phase 2 — Bloques de UI: lib, tipos, alert-dialog y diálogos (sin cablear)
Archivos nuevos, nada reemplaza aún a la UI vigente.
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | setup: `npx shadcn@latest add alert-dialog` | components/ui/alert-dialog.tsx | - | A | AC14 | done |
| T2 | Lib pura de lista y etiquetas, tipo `UserListItem`, con tests | modules/users/lib/user-list.ts, modules/users/lib/user-list.test.ts, modules/users/lib/user-labels.ts, modules/users/types/user-list-item.ts | - | A | AC1–AC6 | done |
| T3 | Diálogo "Invitar usuario" | modules/users/components/invite-user-dialog.tsx | T2 | B | AC8, AC9, AC9b, AC17, AC18 | done |
| T4 | Diálogo "Editar usuario" | modules/users/components/edit-user-dialog.tsx | T2 | B | AC10, AC11, AC12, AC17, AC18 | done |
| T5 | Diálogo "¿Eliminar a X?" con `AlertDialog` | modules/users/components/delete-user-dialog.tsx | T1 | B | AC14, AC15, AC17, AC18 | done |

### Phase 3 — Piezas de la lista (sin cablear)
Archivos nuevos; la página vigente no los importa todavía.
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | `RoleBadge`, `StatusBadge`, `UserAvatar` | modules/users/components/user-badges.tsx | - | A | AC1, AC5, AC18 | done |
| T2 | `UserRowActions` (candado, toggle, editar, eliminar; variantes `icons` y `compact`) | modules/users/components/user-row-actions.tsx | - | A | AC6, AC13, AC17 | done |
| T3 | `UsersPagination` (numerada y simple) | modules/users/components/users-pagination.tsx | - | A | AC4, AC17 | done |
| T4 | `UsersFilters` (búsqueda, rol, estado, Limpiar) | modules/users/components/users-filters.tsx | - | A | AC2, AC17, AC18 | done |
| T5 | `UserCards` (móvil) | modules/users/components/user-cards.tsx | T1, T2 | B | AC1, AC4, AC5, AC6 | done |

Nota T5: importa `user-badges.tsx` y `user-row-actions.tsx` (T1, T2 de esta fase), por eso corre después (Group B).

### Phase 4 — Composición, reemplazo de la UI vigente, limpieza y docs
Al cierre de la fase la app usa solo la UI nueva.
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | `UsersTable` reescrita (tabla de solo lectura + acciones por callbacks) | modules/users/components/users-table.tsx | - | A | AC1, AC4, AC5, AC6, AC17 | done |
| T2 | `UsersPanel` (estado, filtros, paginación, aviso, diálogos, tabla/tarjetas con `useMediaQuery`) | modules/users/components/users-panel.tsx | - | A | AC2, AC3, AC4, AC7, AC17 | done |
| T3 | `UsersAdminPage` (cabecera "Usuarios y roles", resumen, botón "Invitar usuario", fondo `bg-slate-50`) | modules/users/components/users-admin-page.tsx | - | A | AC1, AC16, AC18 | done |
| T4 | Limpieza: borrar `create-staff-dialog.tsx`; retirar `createStaffUser`, `createStaffSchema`, `changeUserRoleAction`, `changeRoleSchema`, el código `email-taken` y sus tests | modules/users/components/create-staff-dialog.tsx, modules/users/schemas/user-admin-schema.ts, modules/users/schemas/user-admin-schema.test.ts, modules/users/actions/user-admin-actions.ts, modules/users/services/user-admin-service.ts | T1, T2, T3 | B | AC20 | done |
| T5 | Docs: `system-design.md` §2 "Panel de super admin" (invitar, editar, eliminar, búsqueda/filtros/paginación, D5) y línea de `user.deleted` en `mer.md` | docs/architecture/system-design.md, docs/architecture/mer.md | - | A | AC19 | done |

Nota Fase 4: T1–T3 reescriben archivos que la UI vigente importaba entre sí, por lo que `tsc` pasa **al cierre de la fase**, no por tarea. T4 va al final porque borra lo que T1–T3 dejan de usar. Verificación manual con la instancia dev (H1–H3 de la spec vigente ya hechos): invitar nuevo/existente, editar (incluida suspensión de organizador), eliminar sin y con datos, filtros y paginación en 1280px y 390px.

## Open questions
Ninguna bloquea el diseño; todas tienen default.
- Q1 (D9) El diseño no pide nombre al invitar: se usa la parte local del correo y se edita luego. Si se prefiere pedirlo, es un campo más en `inviteUserSchema` y el diálogo.
- Q2 (Out) El diseño móvil no incluye el botón check de suspender/reactivar; se hace desde "Editar". ¿Se agrega a las tarjetas?
- Q3 (D12) El rojo de peligro del diseño (#B91C1C) difiere del `--destructive` del proyecto (#be123c): el botón Eliminar usa `red-700`. Si se prefiere un solo rojo, usar `variant="destructive"`.
- Q4 (D8) Regla extra no pedida: un organizador suspendido no cambia de rol hasta reactivarlo (evita suspendidos invisibles). Se puede quitar.
- Contradicción con docs (se resuelve en Fase 4 T5): `mer.md` ("Usuario borrado en Clerk: la fila queda `suspended`") y `system-design.md` §2 (`user.deleted` no borra la fila) siguen valiendo para el webhook; el panel agrega el borrado explícito sin datos.
