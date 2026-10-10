import type { Role } from "@/modules/auth";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { initials } from "../lib/user-list";
import { ORGANIZER_STATUS_LABEL, ROLE_LABEL } from "../lib/user-labels";

const BADGE = "h-6.5 px-2.5";

const ROLE_CLASS: Record<Role, string> = {
  super_admin: "bg-violet-100 text-violet-800",
  admin: "bg-indigo-50 text-indigo-800",
  organizer: "bg-amber-100 text-amber-800",
  customer: "bg-gray-100 text-gray-700",
};

const STATUS_CLASS: Record<"active" | "suspended", string> = {
  active: "bg-green-100 text-green-800",
  suspended: "bg-red-100 text-red-800",
};

export function RoleBadge({ role }: { role: Role }) {
  return <Badge className={cn(BADGE, ROLE_CLASS[role])}>{ROLE_LABEL[role]}</Badge>;
}

export function StatusBadge({ status }: { status: "active" | "suspended" }) {
  return <Badge className={cn(BADGE, STATUS_CLASS[status])}>{ORGANIZER_STATUS_LABEL[status]}</Badge>;
}

export function UserAvatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[13px] font-semibold text-indigo-800"
    >
      {initials(name)}
    </span>
  );
}
