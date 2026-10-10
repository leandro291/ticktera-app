import { requirePagePermission } from "@/modules/auth/server"
import { listUsers } from "../services/user-admin-service"
import type { UserListItem } from "../types/user-list-item"
import { UsersPanel } from "./users-panel"

/** AC16: panel del super admin. El permiso se valida antes de tocar la BD. */
export async function UsersAdminPage() {
  const currentUser = await requirePagePermission("users:manage-roles")
  // Solo las columnas que la lista muestra: no se serializa `clerkUserId` al cliente.
  const users: UserListItem[] = (await listUsers()).map(
    ({ id, email, fullName, role, status, createdAt }) => ({ id, email, fullName, role, status, createdAt }),
  )

  return (
    <main className="w-full flex-1 bg-slate-50">
      <div className="mx-auto w-full max-w-[1120px] px-6 pt-8 pb-10">
        <UsersPanel users={users} currentUserId={currentUser.id} />
      </div>
    </main>
  )
}
