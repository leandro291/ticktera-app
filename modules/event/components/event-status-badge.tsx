import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AvailabilityStatus } from "../types/event";

const STATUS_BADGE: Partial<Record<AvailabilityStatus, { label: string; className: string }>> = {
  "last-tickets": { label: "Últimas entradas", className: "bg-warning text-warning-foreground" },
  "sold-out": { label: "Agotado", className: "bg-strong text-white" },
};

export function EventStatusBadge({ status, className }: { status: AvailabilityStatus; className?: string }) {
  const badge = STATUS_BADGE[status];
  if (!badge) return null;
  return <Badge className={cn("font-semibold", badge.className, className)}>{badge.label}</Badge>;
}
