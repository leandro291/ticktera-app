import { PanelShell } from "@/components/shared/panel-shell";
import { parseRole } from "@/modules/auth";
import { requirePagePermission } from "@/modules/auth/server";

export default async function OrganizerLayout({ children }: LayoutProps<"/organizer">) {
  const user = await requirePagePermission("organizer:panel");
  return (
    <PanelShell role={parseRole(user.role)} fullName={user.fullName}>
      {children}
    </PanelShell>
  );
}
