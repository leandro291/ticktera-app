import { redirect } from "next/navigation"
import { can, parseRole, type Permission } from "../lib/permissions"
import { getCurrentUser } from "./current-user"
import type { UserRow } from "./user-sync"

export type AuthorizationErrorCode = "unauthenticated" | "suspended" | "forbidden"

export class AuthorizationError extends Error {
  readonly code: AuthorizationErrorCode

  constructor(code: AuthorizationErrorCode) {
    super(code)
    this.name = "AuthorizationError"
    this.code = code
  }
}

/** Para actions y route handlers. Decide por la fila de la BD, nunca por claims (D6). */
export async function requirePermission(permission: Permission): Promise<UserRow> {
  const user = await getCurrentUser()
  if (!user) throw new AuthorizationError("unauthenticated")
  if (user.status !== "active") throw new AuthorizationError("suspended")
  if (!can(parseRole(user.role), permission)) throw new AuthorizationError("forbidden")
  return user
}

/** Para layouts y pages: redirige a /sign-in (sin sesión) o a / (suspendido / sin permiso). */
export async function requirePagePermission(permission: Permission): Promise<UserRow> {
  try {
    return await requirePermission(permission)
  } catch (e) {
    if (e instanceof AuthorizationError) redirect(e.code === "unauthenticated" ? "/sign-in" : "/")
    throw e
  }
}
