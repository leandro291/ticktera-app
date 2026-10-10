import type { Metadata } from "next"
import { UsersAdminPage } from "@/modules/users"

export const metadata: Metadata = { title: "Usuarios" }

export default function SuperAdminUsersPage() {
  return <UsersAdminPage />
}
