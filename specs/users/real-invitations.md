# Invitar usuario por correo (invitaciones de Clerk)

- Module: users
- Status: done
- Approved by: lenadro291 (2026-10-05)
- Mode: SDD

## Goal
Que "Invitar usuario" en `/super-admin/users` le mande a la persona un correo de invitación de Clerk y que, al aceptarlo, llegue a la app (`/sign-up` del mismo origen desde el que se invitó, p. ej. `http://localhost:3000`) y quede con el rol elegido.

## Supersedes (spec `users/users-crud-design`, done)
- D4 y AC8 (invitar = `createUser`, sin email): un correo nuevo ya no crea la cuenta; se crea una invitación de Clerk y la fila en `users` nace al aceptarla.
- Scope Out "Invitaciones reales de Clerk / envío de email": pasa a In.
- AC9 (correo ya existente en `users` → cambia el rol) y AC9b: **sin cambios**.

## Scope
- In: `inviteUser` con `client.invitations.createInvitation`; el rol invitado se respeta al crear la fila (webhook `user.created` y sync perezoso); texto y aviso del diálogo; docs.
- Out: listar/reenviar/revocar invitaciones pendientes desde el panel (se hace en el Dashboard de Clerk → Users → Invitations); estado "Pendiente" en la lista; plantilla de correo propia.

## Decisiones
| # | Decisión |
| - | -------- |
| D1 | **Correo nuevo → `createInvitation({ emailAddress, publicMetadata: { role }, redirectUrl, notify: true })`.** No se crea usuario en Clerk ni fila en `users`: ambos nacen cuando la persona acepta. Se borra `createClerkAndDbUser` (único llamador) y su compensación. |
| D2 | **`redirectUrl` = `${origin}/sign-up`, con `origin` del header `Origin` de la server action** (`headers()` de `next/headers`). Funciona igual en localhost y en producción sin variable de entorno nueva. Next ya rechaza server actions con `Origin` distinto del host. Si falta el header, la acción falla con el error genérico (no se invita sin destino). `<SignUp />` de `app/sign-up` procesa el `__clerk_ticket` solo (correo ya verificado). |
| D3 | **El rol invitado se aplica solo al crear la fila.** `resolveRole` recibe `invitedRole` (= `profile.metadataRole`) y lo usa cuando `current === null` y vale `admin` u `organizer`. Es seguro: `publicMetadata` solo se escribe desde el backend (acá, la invitación del super admin). `super_admin` nunca sale de metadata (solo por `SUPER_ADMIN_EMAIL`, sin cambios). Con fila existente nada cambia: el rol de la BD manda (AC3/AC5 de `clerk-db-roles-and-seed`). |
| D4 | **Errores de Clerk** (invitación pendiente para ese correo, correo ya registrado en Clerk pero no en `users`) siguen saliendo como `clerk-rejected` bajo el campo correo (AC9b). Sin `ignoreExisting`: reenviar se hace revocando en el Dashboard. |

## Reuse
- Reuse: `inviteUser`, `changeUserRole`, `UserAdminError`/`clerk-rejected` (`modules/users/services/user-admin-service.ts`); `run` e `inviteUserAction` (`modules/users/actions/user-admin-actions.ts`); `InviteUserDialog` (solo texto); `syncClerkUser` (`modules/auth/services/user-sync.ts`) y `resolveRole` (`modules/auth/lib/clerk-profile.ts`); `app/sign-up/[[...sign-up]]/page.tsx` sin cambios.
- No instalar nada. Sin migraciones. Sin variables de entorno nuevas.

## Acceptance criteria
- AC1: Invitar un correo que no está en `users` crea una invitación de Clerk con `publicMetadata.role` = rol elegido y `redirectUrl` = `<origin de la acción>/sign-up`, y Clerk envía el correo. No se crea usuario en Clerk ni fila en `users`. Aviso: "Invitación enviada a {correo}."
- AC2: Al aceptar el correo, la persona llega a `/sign-up` de la app, termina el registro y, al sincronizarse (webhook `user.created` o sync perezoso), su fila en `users` queda con el rol invitado y Clerk no se re-espeja a `customer`.
- AC3: Un usuario que se registra sin invitación sigue naciendo `customer`; el correo de `SUPER_ADMIN_EMAIL` sigue naciendo `super_admin`; una fila existente nunca cambia de rol por metadata.
- AC4: Correo ya existente en `users` → cambia el rol como hoy (AC9 de `users-crud-design`), sin invitación.
- AC5: Si Clerk rechaza la invitación, el mensaje de Clerk se muestra bajo el campo correo y no se crea nada (AC9b).
- AC6: Texto del diálogo: "Si el correo ya tiene cuenta, se cambia su rol. Si no, le enviamos una invitación por correo para crear su cuenta."
- AC7: `system-design.md` §2 "Panel de super admin" describe la invitación por correo (D1–D3) en lugar de `createUser`.
- AC8: Pasan `npm run lint`, `npx tsc --noEmit` y `npm test`.

## Contracts
```ts
// modules/auth/lib/clerk-profile.ts
export function resolveRole(p: {
  current: Role | null
  email: string
  superAdminEmail?: string
  invitedRole?: Role | null // D3: solo cuenta si current === null y es "admin" | "organizer"
}): Role

// modules/users/services/user-admin-service.ts
export async function inviteUser(
  actor: { id: string },
  input: { email: string; role: "admin" | "organizer"; redirectUrl: string },
): Promise<{ outcome: "invited" } | { outcome: "role-updated"; user: UserRow }>
```
`syncClerkUser` pasa `invitedRole: profile.metadataRole` a `resolveRole`. `inviteUserAction` lee `Origin` y arma `redirectUrl`; notices: `invited` → "Invitación enviada a {correo}.", `role-updated` → sin cambios.

## Edge cases
- Invitación aceptada con Google en vez de contraseña: el usuario igual hereda `publicMetadata` de la invitación (Clerk la consume por el ticket); D3 aplica igual.
- El webhook y el sync perezoso compiten al primer ingreso: los dos pasan por `syncClerkUser` con el mismo `invitedRole`, el upsert es idempotente.
- Usuarios ya creados con el flujo viejo (`createUser`, p. ej. el de prueba): siguen existiendo; para re-probar, eliminarlos desde el panel e invitarlos de nuevo.
- Producción: el origen de `redirectUrl` debe ser el dominio de la app configurado en Clerk (en desarrollo, localhost se acepta).

## Tests
- `modules/auth/lib/clerk-profile.test.ts` (extiende) — AC2, AC3: `resolveRole` con `current: null` + `invitedRole` `admin`/`organizer` → ese rol; `invitedRole: "super_admin"` o `"customer"` → `customer`; `current: "customer"` + `invitedRole: "admin"` → `customer`; email de super admin gana sobre `invitedRole`.
- Sin tests de Clerk ni de BD (igual que la spec base); verificación manual: invitar en dev, aceptar el correo, llegar a `localhost:3000/sign-up`, ver la fila con el rol en el panel.

## Plan

### Phase 1 — Invitación real
| ID | Task | Owns | Depends on | Group | Criteria | Status |
| -- | ---- | ---- | ---------- | ----- | -------- | ------ |
| T1 | `resolveRole` con `invitedRole` + tests; `syncClerkUser` lo pasa | modules/auth/lib/clerk-profile.ts, modules/auth/lib/clerk-profile.test.ts, modules/auth/services/user-sync.ts | - | A | AC2, AC3 | done |
| T2 | `inviteUser` con `createInvitation` (borra `createClerkAndDbUser`); `inviteUserAction` con `Origin` y notice; texto del diálogo | modules/users/services/user-admin-service.ts, modules/users/actions/user-admin-actions.ts, modules/users/components/invite-user-dialog.tsx | - | A | AC1, AC4, AC5, AC6 | done |
| T3 | Docs `system-design.md` §2 | docs/architecture/system-design.md | - | A | AC7 | done |

## Open questions
- Q1 (Out) ¿Mostrar invitaciones pendientes en el panel (con reenviar/revocar)? Default: no, se gestionan en el Dashboard de Clerk.
