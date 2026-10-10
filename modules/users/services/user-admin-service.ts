import { clerkClient } from "@clerk/nextjs/server"
import { isClerkAPIResponseError } from "@clerk/nextjs/errors"
import { desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { users } from "@/db/schema"
import type { Role } from "@/modules/auth"
import { mirrorRoleToClerk, type UserRow } from "@/modules/auth/server"
import { isForeignKeyViolation } from "../lib/db-errors"
import {
  checkRoleChange,
  checkStatusChange,
  checkUserDelete,
  checkUserUpdate,
} from "../lib/role-change-rules"

export type UserAdminErrorCode =
  | "clerk-rejected" // Clerk rechazó la operación (ej. email ya existe en Clerk)
  | "not-found"
  | "self"
  | "target-super-admin"
  | "invalid-role"
  | "suspended-organizer" // D8: organizador suspendido no cambia de rol
  | "has-data" // FK 23503: tiene eventos u órdenes

export class UserAdminError extends Error {
  readonly code: UserAdminErrorCode

  constructor(code: UserAdminErrorCode, message: string = code) {
    super(message)
    this.name = "UserAdminError"
    this.code = code
  }
}

type Actor = { id: string }

export async function listUsers(): Promise<UserRow[]> {
  return db.select().from(users).orderBy(desc(users.createdAt))
}

async function findUser(userId: string): Promise<UserRow> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) throw new UserAdminError("not-found")
  return user
}

// Clerk 3.22 (@clerk/backend): UpdateUserParams.lastName es `string` (no acepta null) y las claves
// `undefined` no viajan en el body, así que para vaciarlo hay que mandar "" (verificado en tipos; la
// aceptación de "" por la API de Clerk no se pudo probar sin red). Un 404 de Clerk es un
// ClerkAPIResponseError con `status === 404`.
function isClerk404(error: unknown): boolean {
  return isClerkAPIResponseError(error) && error.status === 404
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const [firstName = "", ...rest] = fullName.trim().split(/\s+/)
  return { firstName, lastName: rest.join(" ") }
}

/** Correo en `users` → changeUserRole; si no, invitación de Clerk (la fila nace al aceptarla, con el rol de publicMetadata). */
export async function inviteUser(
  actor: Actor,
  input: { email: string; role: "admin" | "organizer"; redirectUrl: string },
): Promise<{ outcome: "invited" } | { outcome: "role-updated"; user: UserRow }> {
  const email = input.email.toLowerCase()
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1)
  if (existing) {
    const user = await changeUserRole(actor, { userId: existing.id, role: input.role })
    return { user, outcome: "role-updated" }
  }
  const client = await clerkClient()
  try {
    await client.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: { role: input.role },
      redirectUrl: input.redirectUrl,
      notify: true,
    })
  } catch (error) {
    const message = isClerkAPIResponseError(error)
      ? (error.errors[0]?.longMessage ?? error.errors[0]?.message)
      : undefined
    throw new UserAdminError("clerk-rejected", message ?? "No se pudo enviar la invitación")
  }
  return { outcome: "invited" }
}

/** D5: reglas, BD primero, luego espejo. Sin corto-circuito si el rol ya coincide: el reintento re-espeja. */
export async function changeUserRole(
  actor: Actor,
  input: { userId: string; role: Role },
): Promise<UserRow> {
  const target = await findUser(input.userId)
  const check = checkRoleChange(actor, target, input.role)
  if (!check.ok) throw new UserAdminError(check.reason)

  const [row] = await db
    .update(users)
    .set({ role: input.role })
    .where(eq(users.id, target.id))
    .returning()
  await mirrorRoleToClerk(row.clerkUserId, row.role)
  return row
}

/** D5: reglas, BD primero, luego banUser/unbanUser (idempotente al reintentar). */
export async function setUserStatus(
  actor: Actor,
  input: { userId: string; status: "active" | "suspended" },
): Promise<UserRow> {
  const target = await findUser(input.userId)
  const check = checkStatusChange(actor, target)
  if (!check.ok) throw new UserAdminError(check.reason)

  const [row] = await db
    .update(users)
    .set({ status: input.status })
    .where(eq(users.id, target.id))
    .returning()
  const client = await clerkClient()
  if (input.status === "suspended") await client.users.banUser(row.clerkUserId)
  else await client.users.unbanUser(row.clerkUserId)
  return row
}

/**
 * D6: reglas → un solo UPDATE en BD → Clerk (nombre, rol, ban). Sin corto-circuito: reenviar tras un
 * fallo de Clerk repite las llamadas idempotentes.
 */
export async function updateUser(
  actor: Actor,
  input: { userId: string; fullName: string; role: Role; status?: "active" | "suspended" },
): Promise<UserRow> {
  const target = await findUser(input.userId)
  const check = checkUserUpdate(actor, target, { role: input.role })
  if (!check.ok) throw new UserAdminError(check.reason)

  // El estado solo aplica a organizadores (D2); si no, la fila conserva el suyo.
  const status = input.role === "organizer" ? input.status : undefined
  const [row] = await db
    .update(users)
    .set({ fullName: input.fullName, role: input.role, ...(status && { status }) })
    .where(eq(users.id, target.id))
    .returning()

  const client = await clerkClient()
  // ponytail: sin diff contra Clerk; si molesta, comparar con el usuario de Clerk
  await client.users.updateUser(row.clerkUserId, splitName(row.fullName))
  await mirrorRoleToClerk(row.clerkUserId, row.role)
  if (status === "suspended") await client.users.banUser(row.clerkUserId)
  else if (status === "active") await client.users.unbanUser(row.clerkUserId)
  return row
}

/**
 * D5: DELETE en una transacción que envuelve el deleteUser de Clerk. La FK (23503) es el chequeo de
 * datos: lanza antes de tocar Clerk. Si Clerk falla (salvo 404) la transacción revierte el DELETE.
 */
export async function deleteUser(actor: Actor, input: { userId: string }): Promise<UserRow> {
  const target = await findUser(input.userId)
  const check = checkUserDelete(actor, target)
  if (!check.ok) throw new UserAdminError(check.reason)

  const client = await clerkClient()
  try {
    await db.transaction(async (tx) => {
      await tx.delete(users).where(eq(users.id, target.id))
      try {
        await client.users.deleteUser(target.clerkUserId)
      } catch (error) {
        if (!isClerk404(error)) throw error
      }
    })
  } catch (error) {
    if (isForeignKeyViolation(error)) throw new UserAdminError("has-data")
    throw error
  }
  return target
}
