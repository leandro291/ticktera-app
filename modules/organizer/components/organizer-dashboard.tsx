"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CalendarIcon, ChartColumnIcon, CircleAlertIcon, CircleCheckIcon, ImageIcon, PlusIcon, SearchIcon, TicketIcon, XIcon } from "lucide-react";
import { DatePicker } from "@/components/shared/date-picker";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { EventListError, formatDateShort, formatPriceCents, isoToLimaDate, useEvents, type EventDbStatus, type ManagedEventItem } from "@/modules/event";
import { filterEvents, getOrganizerKpis, NO_FILTERS, type EventFilters, type EventStatusFilter } from "../lib/event-stats";
import { DashboardError, DashboardSkeleton } from "./dashboard-states";
import { EventRowActions, type RowNotice } from "./event-row-actions";
import { SoldBar } from "./sold-bar";

export type SavedNotice = "published" | "draft" | "updated";

const FILTERS: { key: EventStatusFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "published", label: "Publicados" },
  { key: "draft", label: "Borradores" },
];

const STATUS_BADGE: Record<EventDbStatus, { label: string; className: string }> = {
  published: { label: "Publicado", className: "bg-green-100 text-green-800" },
  draft: { label: "Borrador", className: "bg-muted text-zinc-700" },
  cancelled: { label: "Cancelado", className: "bg-red-100 text-red-800" },
  suspended: { label: "Suspendido", className: "bg-amber-100 text-amber-800" },
};

const SAVED_MESSAGE: Record<SavedNotice, string> = {
  published: "Tu evento se publicó.",
  draft: "Guardamos tu borrador.",
  updated: "Guardamos los cambios.",
};

const number = new Intl.NumberFormat("es-PE");

const card = "rounded-[20px] border border-border bg-card lg:rounded-[22px]";
const actionLink =
  "flex h-11 items-center justify-center rounded-xl border-[1.5px] border-input px-3.5 text-sm font-semibold text-foreground hover:border-foreground hover:text-foreground lg:inline-flex lg:h-8 lg:rounded-lg lg:px-3 lg:text-xs";
const columns = "lg:grid-cols-[minmax(0,1fr)_120px_minmax(150px,240px)_120px_220px]";
const field = "h-11 text-[15px]"; // mismo alto en todos los filtros (igual que Usuarios)

function Kpi({ label, value, icon: Icon, className, valueClassName }: { label: string; value: string; icon: LucideIcon; className?: string; valueClassName?: string }) {
  return (
    <div className={cn(card, "flex flex-col gap-1.5 p-[18px] lg:gap-2 lg:p-6", className)}>
      <dt className="flex items-center gap-2 text-[13px] text-muted-foreground lg:text-sm">
        <Icon className="hidden size-[17px] lg:block" aria-hidden />
        {label}
      </dt>
      <dd className={cn("text-[22px] font-bold tracking-tight tabular-nums lg:text-[32px]", valueClassName)}>{value}</dd>
    </div>
  );
}

function EventRow({ event, onNotice }: { event: ManagedEventItem; onNotice: (notice: RowNotice) => void }) {
  const { sold, capacity, revenueCents } = event.sales;
  const badge = STATUS_BADGE[event.status];
  const revenue = formatPriceCents(revenueCents);
  const meta = [formatDateShort(isoToLimaDate(event.startsAt)), event.city].filter(Boolean).join(" · ");

  return (
    <li
      className={cn(
        card,
        "flex flex-col gap-3 p-3.5",
        columns,
        "lg:grid lg:items-center lg:gap-4 lg:rounded-none lg:border-0 lg:border-t lg:border-divider lg:px-6 lg:py-3.5",
      )}
    >
      <div className="flex min-w-0 items-center gap-3 lg:gap-3.5">
        <span className="relative flex size-[52px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent text-primary">
          {event.coverImageUrl ? (
            <Image src={event.coverImageUrl} alt="" fill sizes="52px" className="object-cover" unoptimized={!event.coverImageUrl.startsWith("/")} />
          ) : (
            <ImageIcon className="size-5" aria-hidden />
          )}
        </span>
        <span className="flex min-w-0 grow flex-col gap-0.5">
          <span className="truncate text-[15px] font-semibold">{event.title}</span>
          <span className="text-xs text-muted-foreground lg:text-[13px]">{meta}</span>
        </span>
        <span className={cn("flex h-[26px] shrink-0 items-center rounded-full px-2.5 text-[11px] font-semibold lg:hidden", badge.className)}>{badge.label}</span>
      </div>

      <span className="hidden lg:block">
        <span className={cn("inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold", badge.className)}>{badge.label}</span>
      </span>

      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-[13px] tabular-nums">
          <span>
            <strong className="font-semibold">{number.format(sold)}</strong>
            <span className="text-muted-foreground"> / {number.format(capacity)} vendidas</span>
          </span>
          <strong className="font-semibold lg:hidden">{revenue}</strong>
        </div>
        <SoldBar sold={sold} capacity={capacity} />
      </div>

      <span className="hidden text-right text-sm font-semibold tabular-nums lg:block">{revenue}</span>

      <EventRowActions event={event} onNotice={onNotice} triggerClassName={actionLink} />
    </li>
  );
}

export function OrganizerDashboard({ saved }: { saved?: SavedNotice }) {
  const { data: events = [], isPending, isError, error, refetch } = useEvents("mine");
  const [filters, setFilters] = useState<EventFilters>(NO_FILTERS);
  const [notice, setNotice] = useState<RowNotice | null>(saved ? { text: SAVED_MESSAGE[saved], kind: "success" } : null);
  const set = (patch: Partial<EventFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const filtering = filters.status !== "all" || !!(filters.query || filters.from || filters.to);
  const kpis = getOrganizerKpis(events);
  const visible = filterEvents(events, filters);
  const forbidden = error instanceof EventListError && [401, 403].includes(error.status);

  return (
    <main className="flex w-full max-w-[1176px] flex-col gap-5 px-4 pt-[22px] pb-9 lg:gap-8 lg:px-12 lg:py-10">
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-col gap-1 lg:gap-1.5">
          <h1 className="text-[28px] leading-[1.15] font-bold tracking-tight lg:text-[32px]">Eventos</h1>
          <p className="text-sm text-muted-foreground lg:text-[15px]">Así van las ventas de tus eventos.</p>
        </div>
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
        <DashboardSkeleton />
      ) : isError ? (
        <DashboardError forbidden={forbidden} onRetry={forbidden ? undefined : () => refetch()} />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-5">
            <Kpi label="Entradas vendidas" value={number.format(kpis.sold)} icon={TicketIcon} className="lg:order-1" />
            <Kpi label="Ingresos" value={formatPriceCents(kpis.revenueCents)} icon={ChartColumnIcon} className="order-first col-span-2 lg:order-2 lg:col-span-1" valueClassName="text-[28px]" />
            <Kpi label="Eventos publicados" value={String(kpis.published)} icon={CalendarIcon} className="lg:order-3" />
          </dl>

          <section id="my-events" aria-labelledby="my-events-title" className={cn("flex scroll-mt-20 flex-col gap-3 lg:gap-0 lg:overflow-hidden", "lg:rounded-[22px] lg:border lg:border-border lg:bg-card")}>
            <div className="flex flex-col gap-3 lg:gap-4 lg:border-b lg:border-divider lg:px-6 lg:py-[18px]">
              <div className="flex items-center justify-between gap-3">
                <h2 id="my-events-title" className="text-lg font-semibold">
                  Mis eventos
                </h2>
                <Link
                  href="/organizer/events/new"
                  className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                >
                  <PlusIcon className="size-4" strokeWidth={2.25} aria-hidden />
                  Crear evento
                </Link>
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
                <div className="relative lg:w-64">
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input
                    type="search"
                    aria-label="Buscar por nombre"
                    placeholder="Buscar por nombre"
                    value={filters.query}
                    onChange={(e) => set({ query: e.target.value })}
                    className={cn(field, "pl-9")}
                  />
                </div>
                <div role="group" aria-label="Filtrar por estado" className="grid h-11 grid-cols-3 gap-1 rounded-lg bg-border p-1 lg:flex lg:bg-muted">
                  {FILTERS.map((f) => {
                    const on = filters.status === f.key;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        aria-pressed={on}
                        onClick={() => set({ status: f.key })}
                        className={cn(
                          "h-full rounded-md px-3.5 text-[13px]",
                          on ? "bg-background font-semibold shadow-[0_2px_8px_-4px_rgba(24,24,27,.3)]" : "font-medium hover:bg-background/60",
                        )}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 gap-3 lg:flex">
                  <DatePicker value={filters.from} max={filters.to || undefined} onChange={(from) => set({ from })} placeholder="Desde" aria-label="Desde" className={cn(field, "lg:w-44")} />
                  <DatePicker value={filters.to} min={filters.from || undefined} onChange={(to) => set({ to })} placeholder="Hasta" aria-label="Hasta" className={cn(field, "lg:w-44")} />
                </div>
                {filtering && (
                  <button
                    type="button"
                    onClick={() => setFilters(NO_FILTERS)}
                    className="flex h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                  >
                    <XIcon className="size-4" aria-hidden />
                    Limpiar
                  </button>
                )}
              </div>
            </div>
            <div
              aria-hidden
              className={cn("hidden gap-4 px-6 py-3 text-xs font-semibold tracking-[0.04em] text-muted-foreground uppercase lg:grid", columns)}
            >
              <span>Evento</span>
              <span>Estado</span>
              <span>Vendidas</span>
              <span className="text-right">Ingresos</span>
              <span />
            </div>
            {visible.length ? (
              <ul aria-label="Mis eventos" className="flex flex-col gap-2.5 lg:gap-0">
                {visible.map((event) => (
                  <EventRow key={event.id} event={event} onNotice={setNotice} />
                ))}
              </ul>
            ) : (
              <p className={cn(card, "px-6 py-10 text-center text-sm text-muted-foreground lg:rounded-none lg:border-0 lg:border-t lg:border-divider")}>
                {events.length ? "Ningún evento coincide con los filtros." : "Todavía no tienes eventos en la base de datos."}
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
