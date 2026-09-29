"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CalendarIcon, ChartColumnIcon, CircleCheckIcon, ImageIcon, PlusIcon, TicketIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateShort, formatPrice } from "@/modules/event";
import { filterEventsByStatus, getEventStats, getOrganizerKpis, type EventStatusFilter } from "../lib/event-stats";
import { useOrganizerStore } from "../store/use-organizer-store";
import type { OrganizerEvent, OrganizerEventStatus } from "../types/organizer-event";
import { EventSalesSheet } from "./event-sales-sheet";
import { SoldBar } from "./sold-bar";

export type SavedNotice = OrganizerEventStatus;

const FILTERS: { key: EventStatusFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "published", label: "Publicados" },
  { key: "draft", label: "Borradores" },
];

const STATUS_BADGE: Record<OrganizerEventStatus, { label: string; className: string }> = {
  published: { label: "Publicado", className: "bg-green-100 text-green-800" },
  draft: { label: "Borrador", className: "bg-muted text-zinc-700" },
};

const SAVED_MESSAGE: Record<SavedNotice, string> = {
  published: "Tu evento se publicó.",
  draft: "Guardamos tu borrador.",
};

const number = new Intl.NumberFormat("es-PE");

const card = "rounded-[20px] border border-border bg-card lg:rounded-[22px]";
const actionLink =
  "flex h-11 items-center justify-center rounded-xl border-[1.5px] border-input px-3.5 text-sm font-semibold text-foreground hover:border-foreground hover:text-foreground lg:inline-flex lg:h-10 lg:rounded-[11px] lg:text-[13px]";

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

function EventRow({ event }: { event: OrganizerEvent }) {
  const stats = getEventStats(event);
  const badge = STATUS_BADGE[event.status];
  const draft = event.status === "draft";
  const revenue = draft ? "—" : formatPrice(stats.revenue);
  const meta = [event.date ? formatDateShort(event.date) : "Sin fecha", event.city].filter(Boolean).join(" · ");

  return (
    <li
      className={cn(
        card,
        "flex flex-col gap-3 p-3.5",
        "lg:grid lg:grid-cols-[minmax(0,1fr)_130px_minmax(180px,260px)_150px_140px] lg:items-center lg:gap-4 lg:rounded-none lg:border-0 lg:border-t lg:border-divider lg:px-6 lg:py-3.5",
      )}
    >
      <div className="flex min-w-0 items-center gap-3 lg:gap-3.5">
        <span className="relative flex size-[52px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent text-primary">
          {event.image ? (
            <Image src={event.image} alt="" fill sizes="52px" className="object-cover" unoptimized={event.image.startsWith("blob:")} />
          ) : (
            <ImageIcon className="size-5" aria-hidden />
          )}
        </span>
        <span className="flex min-w-0 grow flex-col gap-0.5">
          <span className="truncate text-[15px] font-semibold">{event.title || "Evento sin nombre"}</span>
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
            <strong className="font-semibold">{number.format(stats.sold)}</strong>
            <span className="text-muted-foreground"> / {number.format(stats.capacity)} vendidas</span>
          </span>
          <strong className="font-semibold lg:hidden">{revenue}</strong>
        </div>
        <SoldBar sold={stats.sold} capacity={stats.capacity} />
      </div>

      <span className="hidden text-right text-sm font-semibold tabular-nums lg:block">{revenue}</span>

      <span className="lg:text-right">
        {draft ? (
          <Link href={`/organizer/events/new?draft=${event.id}`} className={actionLink} aria-label={`Editar ${event.title || "borrador"}`}>
            Editar
          </Link>
        ) : (
          <EventSalesSheet event={event} triggerClassName={cn(actionLink, "w-full bg-transparent lg:w-auto")} />
        )}
      </span>
    </li>
  );
}

export function OrganizerDashboard({ saved }: { saved?: SavedNotice }) {
  const events = useOrganizerStore((s) => s.events);
  const [filter, setFilter] = useState<EventStatusFilter>("all");
  const kpis = getOrganizerKpis(events);
  const visible = filterEventsByStatus(events, filter);

  return (
    <main className="flex w-full max-w-[1176px] flex-col gap-5 px-4 pt-[22px] pb-9 lg:gap-8 lg:px-12 lg:py-10">
      <div className="flex flex-col gap-3.5 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
        <div className="flex flex-col gap-1 lg:gap-1.5">
          <h1 className="text-[28px] leading-[1.15] font-bold tracking-tight lg:text-[32px]">Resumen</h1>
          <p className="text-sm text-muted-foreground lg:text-[15px]">Así van las ventas de tus eventos.</p>
        </div>
        <Link
          href="/organizer/events/new"
          className="flex h-[50px] items-center justify-center gap-2 rounded-[14px] bg-primary px-[22px] text-[15px] font-semibold text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
        >
          <PlusIcon className="size-[18px]" strokeWidth={2.25} aria-hidden />
          Crear evento
        </Link>
      </div>

      {saved && (
        <p role="status" className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
          <CircleCheckIcon className="size-[18px] shrink-0" aria-hidden />
          {SAVED_MESSAGE[saved]}
        </p>
      )}

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-5">
        <Kpi label="Entradas vendidas" value={number.format(kpis.sold)} icon={TicketIcon} className="lg:order-1" />
        <Kpi label="Ingresos" value={formatPrice(kpis.revenue)} icon={ChartColumnIcon} className="order-first col-span-2 lg:order-2 lg:col-span-1" valueClassName="text-[28px]" />
        <Kpi label="Eventos publicados" value={String(kpis.published)} icon={CalendarIcon} className="lg:order-3" />
      </dl>

      <section id="my-events" aria-labelledby="my-events-title" className={cn("flex scroll-mt-20 flex-col gap-3 lg:gap-0 lg:overflow-hidden", "lg:rounded-[22px] lg:border lg:border-border lg:bg-card")}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:border-b lg:border-divider lg:px-6 lg:py-[18px]">
          <h2 id="my-events-title" className="text-lg font-semibold">
            Mis eventos
          </h2>
          <div role="group" aria-label="Filtrar por estado" className="grid grid-cols-3 gap-1 rounded-xl bg-border p-1 lg:flex lg:bg-muted">
            {FILTERS.map((f) => {
              const on = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "h-10 rounded-[9px] px-3.5 text-[13px] lg:h-9",
                    on ? "bg-background font-semibold shadow-[0_2px_8px_-4px_rgba(24,24,27,.3)]" : "font-medium hover:bg-background/60",
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
        <div
          aria-hidden
          className="hidden grid-cols-[minmax(0,1fr)_130px_minmax(180px,260px)_150px_140px] gap-4 px-6 py-3 text-xs font-semibold tracking-[0.04em] text-muted-foreground uppercase lg:grid"
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
              <EventRow key={event.id} event={event} />
            ))}
          </ul>
        ) : (
          <p className={cn(card, "px-6 py-10 text-center text-sm text-muted-foreground lg:rounded-none lg:border-0 lg:border-t lg:border-divider")}>
            No tienes eventos en este estado.
          </p>
        )}
      </section>
    </main>
  );
}
