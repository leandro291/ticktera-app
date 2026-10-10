import { PanelShell } from "@/components/shared/panel-shell"
import { parseRole } from "@/modules/auth"
import { requirePagePermission } from "@/modules/auth/server"

export default async function SuperAdminLayout({ children }: LayoutProps<"/super-admin">) {
  const user = await requirePagePermission("super-admin:panel")
  return (
    <PanelShell role={parseRole(user.role)} fullName={user.fullName}>
      {children}
    </PanelShell>
  )
}
