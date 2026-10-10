"use server"

import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { z } from "zod"
import { AuthorizationError, requirePermission, type UserRow } from "@/modules/auth/server"
import {
  deleteUserSchema,
  inviteUserSchema,
  setStatusSchema,
  updateUserSchema,
} from "../schemas/user-admin-schema"
import {
  UserAdminError,
  deleteUser,
  inviteUser,
  setUserStatus,
  updateUser,
  type UserAdminErrorCode,
} from "../services/user-admin-service"

export type ActionResult =
  | { ok: true; notice: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

const PATH = "/super-admin/users"

const AUTH_MESSAGES = {
  unauthenticated: "Iniciá sesión para continuar.",
  suspended: "Tu cuenta está suspendida.",
  forbidden: "No tenés permiso para gestionar usuarios.",
} as const

const ERROR_MESSAGES: Record<UserAdminErrorCode, string> = {
  "clerk-rejected": "Clerk rechazó la operación.",
  "not-found": "El usuario no existe.",
  self: "No podés aplicarte este cambio a vos mismo.",
  "target-super-admin": "No se puede modificar a un super admin.",
  "invalid-role": "Rol inválido.",
  "suspended-organizer": "Reactivá al organizador antes de cambiarle el rol.",
  "has-data":
    "Tiene eventos u órdenes asociados, por eso no se puede eliminar. Si es organizador, suspendelo en su lugar.",
}

/** AC13: permiso -> Zod -> servicio; errores de dominio mapeados a un resultado serializable. */
async function run<S extends z.ZodType>(
  schema: S,
  input: unknown,
  fn: (actor: UserRow, data: z.output<S>) => Promise<string>,
): Promise<ActionResult> {
  let actor: UserRow
  try {
    actor = await requirePermission("users:manage-roles")
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, error: AUTH_MESSAGES[e.code] }
    console.error("user-admin action: permission check failed", e)
    return { ok: false, error: "No se pudo completar la operación. Reintentá." }
  }

  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      error: "Datos inválidos.",
      fieldErrors: z.flattenError(parsed.error as z.ZodError).fieldErrors as Record<string, string[]>,
    }
  }

  let notice: string
  try {
    notice = await fn(actor, parsed.data)
  } catch (e) {
    if (e instanceof UserAdminError) {
      // clerk-rejected solo lo lanza inviteUser: el motivo de Clerk se muestra bajo el campo email.
      if (e.code === "clerk-rejected") {
        const message = e.message !== e.code ? e.message : ERROR_MESSAGES[e.code]
        return { ok: false, error: ERROR_MESSAGES[e.code], fieldErrors: { email: [message] } }
      }
      return { ok: false, error: ERROR_MESSAGES[e.code] }
    }
    // BD o Clerk fallaron (puede haber quedado a medias, ej. rol en BD sin espejo): se refresca y se permite reintentar.
    console.error("user-admin action failed", e)
    revalidatePath(PATH)
    return { ok: false, error: "No se pudo completar la operación. Reintentá." }
  }

  revalidatePath(PATH)
  return { ok: true, notice }
}

export async function inviteUserAction(input: unknown): Promise<ActionResult> {
  return run(inviteUserSchema, input, async (actor, data) => {
    // D2: vuelve al mismo origen desde el que se invitó (localhost o producción).
    const origin = (await headers()).get("origin")
    if (!origin) throw new Error("inviteUserAction: missing Origin header")
    const result = await inviteUser(actor, { ...data, redirectUrl: `${origin}/sign-up` })
    return result.outcome === "invited"
      ? `Invitación enviada a ${data.email}.`
      : `Rol actualizado para ${result.user.email}.`
  })
}

export async function updateUserAction(input: unknown): Promise<ActionResult> {
  return run(updateUserSchema, input, async (actor, data) => {
    await updateUser(actor, data)
    return "Cambios guardados."
  })
}

export async function deleteUserAction(input: unknown): Promise<ActionResult> {
  return run(deleteUserSchema, input, async (actor, data) => {
    const user = await deleteUser(actor, data)
    return `${user.fullName} fue eliminado.`
  })
}

export async function setUserStatusAction(input: unknown): Promise<ActionResult> {
  return run(setStatusSchema, input, async (actor, data) => {
    const user = await setUserStatus(actor, data)
    return `${user.fullName} fue ${user.status === "suspended" ? "suspendido" : "aprobado"}.`
  })
}
