import { CircleAlertIcon, RotateCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const card = "rounded-[20px] border border-border bg-card lg:rounded-[22px]";

function KpiSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(card, "flex flex-col gap-2 p-[18px] lg:gap-3 lg:p-6", className)}>
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-7 w-20 lg:h-9" />
    </div>
  );
}

function RowSkeleton() {
  return (
    <li className={cn(card, "flex items-center gap-3 p-3.5 lg:rounded-none lg:border-0 lg:border-t lg:border-divider lg:px-6 lg:py-3.5")}>
      <Skeleton className="size-[52px] shrink-0 rounded-xl" />
      <div className="flex grow flex-col gap-2">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="hidden h-7 w-24 rounded-full lg:block" />
    </li>
  );
}

/** KPIs + event rows placeholder, same layout as the loaded dashboard. */
export function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-5 lg:gap-8">
      <span className="sr-only">Cargando tus eventos…</span>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-5">
        <KpiSkeleton className="lg:order-1" />
        <KpiSkeleton className="order-first col-span-2 lg:order-2 lg:col-span-1" />
        <KpiSkeleton className="lg:order-3" />
      </div>
      <ul className="flex flex-col gap-2.5 lg:gap-0 lg:overflow-hidden lg:rounded-[22px] lg:border lg:border-border lg:bg-card">
        {Array.from({ length: 3 }, (_, i) => (
          <RowSkeleton key={i} />
        ))}
      </ul>
    </div>
  );
}

/** `forbidden` (401/403) hides the retry button: retrying won't change the answer. */
export function DashboardError({ forbidden, onRetry }: { forbidden?: boolean; onRetry?: () => void }) {
  return (
    <div role="alert" className={cn(card, "flex flex-col items-center gap-3 px-6 py-10 text-center")}>
      <CircleAlertIcon className="size-6 text-destructive" aria-hidden />
      <p className="text-sm font-medium">{forbidden ? "No tienes acceso a estos datos" : "No pudimos cargar tus eventos. Intenta de nuevo en un momento."}</p>
      {!forbidden && onRetry && (
        <Button type="button" variant="outline" onClick={onRetry}>
          <RotateCwIcon aria-hidden />
          Reintentar
        </Button>
      )}
    </div>
  );
}
