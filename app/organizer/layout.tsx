import { OrganizerShell } from "@/modules/organizer";

export default function OrganizerLayout({ children }: LayoutProps<"/organizer">) {
  return <OrganizerShell>{children}</OrganizerShell>;
}
