import { clerkClient } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { users } from "@/db/schema"
import { env } from "@/lib/env"
import {
  needsRoleMirror,
  resolveRole,
  type ClerkProfile,
} from "../lib/clerk-profile"
import type { Role } from "../lib/permissions"

export type UserRow = typeof users.$inferSelect

export async function mirrorRoleToClerk(clerkUserId: string, role: Role): Promise<void> {
  const client = await clerkClient()
  await client.users.updateUserMetadata(clerkUserId, { publicMetadata: { role } })
}

/**
 * Upsert por clerk_user_id. El rol nunca se degrada ni se cambia por datos de Clerk:
 * solo se escribe en el insert o al promover a super_admin. Espeja a Clerk si hace falta.
 */
export async function syncClerkUser(profile: ClerkProfile): Promise<UserRow> {
  const [existing] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.clerkUserId, profile.clerkUserId))
    .limit(1)

  const role = resolveRole({
    current: existing?.role ?? null,
    email: profile.email,
    superAdminEmail: env.SUPER_ADMIN_EMAIL,
    invitedRole: profile.metadataRole,
  })

  // On conflict (row created meanwhile, e.g. by the panel) keep its role unless promoting.
  const [row] = await db
    .insert(users)
    .values({
      clerkUserId: profile.clerkUserId,
      email: profile.email,
      fullName: profile.fullName,
      role,
    })
    .onConflictDoUpdate({
      target: users.clerkUserId,
      set: {
        email: profile.email,
        fullName: profile.fullName,
        ...(role === "super_admin" ? { role } : {}),
      },
    })
    .returning()

  if (needsRoleMirror(row.role, profile.metadataRole)) {
    await mirrorRoleToClerk(row.clerkUserId, row.role)
  }
  return row
}

/** user.deleted: conserva la fila, solo la suspende. */
export async function suspendClerkUser(clerkUserId: string): Promise<void> {
  await db.update(users).set({ status: "suspended" }).where(eq(users.clerkUserId, clerkUserId))
}
