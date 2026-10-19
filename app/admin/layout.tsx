import { PanelShell } from "@/components/shared/panel-shell"
import { parseRole } from "@/modules/auth"
import { requirePagePermission } from "@/modules/auth/server"

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requirePagePermission("admin:panel")
  return (
    <PanelShell role={parseRole(user.role)} fullName={user.fullName}>
      {children}
    </PanelShell>
  )
}
