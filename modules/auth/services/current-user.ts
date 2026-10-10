import { auth, clerkClient } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"
import { cache } from "react"
import { db } from "@/db"
import { users } from "@/db/schema"
import { env } from "@/lib/env"
import { profileFromClerkUser, resolveRole } from "../lib/clerk-profile"
import { mirrorRoleToClerk, syncClerkUser, type UserRow } from "./user-sync"

/** Usuario de la BD para la sesión actual; sync perezoso si aún no hay fila (D1). */
export const getCurrentUser = cache(async (): Promise<UserRow | null> => {
  const { userId } = await auth()
  if (!userId) return null

  const [row] = await db.select().from(users).where(eq(users.clerkUserId, userId)).limit(1)
  if (row) {
    // Fila creada antes de definir SUPER_ADMIN_EMAIL (o con el env cambiado): promueve sin esperar al webhook (D3).
    // El email de la fila ya es el verificado de Clerk (solo se persiste ese).
    const role = resolveRole({ current: row.role, email: row.email, superAdminEmail: env.SUPER_ADMIN_EMAIL })
    if (role === row.role) return row
    const [promoted] = await db.update(users).set({ role }).where(eq(users.id, row.id)).returning()
    await mirrorRoleToClerk(promoted.clerkUserId, promoted.role)
    return promoted
  }

  const client = await clerkClient()
  const profile = profileFromClerkUser(await client.users.getUser(userId))
  return profile ? syncClerkUser(profile) : null
})
