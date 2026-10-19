"use client";

import { useState } from "react";
import { CircleAlertIcon, CircleCheckIcon, RotateCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useEventMutations } from "../hooks/use-event-mutations";
import { useEvents } from "../hooks/use-events";
import { allowedActions } from "../lib/event-transitions";
import { formatDateShort, formatPriceCents, isoToLimaDate } from "../lib/format";
import type { EventDbStatus, ManagedEventItem } from "../types/event-list";
import { EventActionDialog } from "./event-action-dialog";

// ponytail: mismo mapa que el dashboard del organizador (vive en modules/organizer); unificar si aparece un tercer uso.
const STATUS_BADGE: Record<EventDbStatus, { label: string; className: string }> = {
  published: { label: "Publicado", className: "bg-green-100 text-green-800" },
  draft: { label: "Borrador", className: "bg-muted text-zinc-700" },
  cancelled: { label: "Cancelado", className: "bg-red-100 text-red-800" },
  suspended: { label: "Suspendido", className: "bg-amber-100 text-amber-800" },
};

const number = new Intl.NumberFormat("es-PE");
const card = "rounded-[20px] border border-border bg-card lg:rounded-[22px]";
const columns = "lg:grid-cols-[minmax(0,1fr)_120px_140px_120px_200px]";
const actionButton = "h-11 rounded-xl border-[1.5px] border-input px-3.5 text-sm font-semibold hover:border-foreground disabled:opacity-60 lg:h-8 lg:rounded-lg lg:px-3 lg:text-xs";

type Notice = { text: string; kind: "success" | "error" };

/**
 * D17/AC27: moderación de eventos de cualquier organizador (suspender, reactivar, cancelar). Nunca edita ni elimina.
 * ponytail: sin búsqueda ni filtros; techo ~500 eventos en cliente. Agregar filtro por estado y organizerName (solo scope all) cuando haga falta.
 */
export function ModerationEventsPage() {
  const { data: events = [], isPending, isError, refetch } = useEvents("all");
  const { moderate, isPending: moderating } = useEventMutations();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirm, setConfirm] = useState<{ event: ManagedEventItem; action: "suspend" | "cancel" } | null>(null);

  const reactivate = async (event: ManagedEventItem) => {
    try {
      const result = await moderate({ id: event.id, action: "reactivate" });
      setNotice(result.ok ? { text: result.notice, kind: "success" } : { text: result.error, kind: "error" });
    } catch {
      setNotice({ text: "No se pudo completar la operación. Reintenta.", kind: "error" });
    }
  };

  return (
    <main className="flex w-full max-w-[1176px] flex-col gap-5 px-4 pt-[22px] pb-9 lg:gap-8 lg:px-12 lg:py-10">
      <div className="flex flex-col gap-1 lg:gap-1.5">
        <h1 className="text-[28px] leading-[1.15] font-bold tracking-tight lg:text-[32px]">Eventos</h1>
        <p className="text-sm text-muted-foreground lg:text-[15px]">Eventos de todos los organizadores. Puedes suspenderlos, reactivarlos o cancelarlos.</p>
      </div>

      {notice && (
        <p
          role={notice.kind === "error" ? "alert" : "status"}
          className={cn(
            "flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium",
            notice.kind === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800",
          )}
        >
          {notice.kind === "error" ? <CircleAlertIcon className="size-[18px] shrink-0" aria-hidden /> : <CircleCheckIcon className="size-[18px] shrink-0" aria-hidden />}
          {notice.text}
        </p>
      )}

      {isPending ? (
        <ul aria-busy="true" className="flex flex-col gap-2.5">
          <span className="sr-only">Cargando eventos…</span>
          {[0, 1, 2].map((i) => (
            <li key={i} className={cn(card, "flex items-center gap-3 p-4")}>
              <div className="flex grow flex-col gap-2">
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-7 w-24 rounded-full" />
            </li>
          ))}
        </ul>
      ) : isError ? (
        <div role="alert" className={cn(card, "flex flex-col items-center gap-3 px-6 py-10 text-center")}>
          <CircleAlertIcon className="size-7 text-destructive" aria-hidden />
          <p className="text-sm text-muted-foreground">No pudimos cargar los eventos.</p>
          <Button variant="outline" onClick={() => refetch()} className="h-11 gap-2">
            <RotateCwIcon className="size-4" aria-hidden />
            Reintentar
          </Button>
        </div>
      ) : events.length === 0 ? (
        <p className={cn(card, "px-6 py-10 text-center text-sm text-muted-foreground")}>Todavía no hay eventos.</p>
      ) : (
        <section aria-label="Eventos" className="flex flex-col gap-2.5 lg:gap-0 lg:overflow-hidden lg:rounded-[22px] lg:border lg:border-border lg:bg-card">
          <div aria-hidden className={cn("hidden gap-4 px-6 py-3 text-xs font-semibold tracking-[0.04em] text-muted-foreground uppercase lg:grid", columns)}>
            <span>Evento</span>
            <span>Estado</span>
            <span>Vendidas</span>
            <span className="text-right">Ingresos</span>
            <span />
          </div>
          <ul className="flex flex-col gap-2.5 lg:gap-0">
            {events.map((event) => {
              const badge = STATUS_BADGE[event.status];
              const actions = allowedActions(event.status, { owner: false, moderator: true });
              return (
                <li
                  key={event.id}
                  className={cn(card, "flex flex-col gap-3 p-3.5 lg:grid lg:items-center lg:gap-4 lg:rounded-none lg:border-0 lg:border-t lg:border-divider lg:px-6 lg:py-3.5", columns)}
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-[15px] font-semibold">{event.title}</span>
                    <span className="text-xs text-muted-foreground lg:text-[13px]">
                      {formatDateShort(isoToLimaDate(event.startsAt))} · {event.city}
                    </span>
                  </span>
                  <span>
                    <span className={cn("inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold", badge.className)}>{badge.label}</span>
                  </span>
                  <span className="text-[13px] tabular-nums">
                    <strong className="font-semibold">{number.format(event.sales.sold)}</strong>
                    <span className="text-muted-foreground"> / {number.format(event.sales.capacity)}</span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums lg:text-right">{formatPriceCents(event.sales.revenueCents)}</span>
                  <span className="flex flex-wrap gap-2 lg:justify-end">
                    {actions.includes("suspend") && (
                      <button type="button" className={actionButton} onClick={() => setConfirm({ event, action: "suspend" })}>
                        Suspender
                      </button>
                    )}
                    {actions.includes("reactivate") && (
                      <button type="button" className={actionButton} disabled={moderating} onClick={() => reactivate(event)}>
                        Reactivar
                      </button>
                    )}
                    {actions.includes("cancel") && (
                      <button type="button" className={cn(actionButton, "text-red-700")} onClick={() => setConfirm({ event, action: "cancel" })}>
                        Cancelar
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <EventActionDialog
        event={confirm ? { id: confirm.event.id, title: confirm.event.title, sold: confirm.event.sales.sold } : null}
        action={confirm?.action ?? null}
        mode="moderator"
        onOpenChange={(open) => !open && setConfirm(null)}
        onDone={(text) => {
          setConfirm(null);
          setNotice({ text, kind: "success" });
        }}
      />
    </main>
  );
}
