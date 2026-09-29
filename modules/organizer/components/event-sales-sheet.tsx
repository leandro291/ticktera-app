"use client";

import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { formatPrice } from "@/modules/event";
import { getEventStats } from "../lib/event-stats";
import type { OrganizerEvent } from "../types/organizer-event";
import { SoldBar } from "./sold-bar";

const number = new Intl.NumberFormat("es-PE");

/** "Ver ventas": per-tier breakdown of a published event. */
export function EventSalesSheet({ event, triggerClassName }: { event: OrganizerEvent; triggerClassName: string }) {
  const stats = getEventStats(event);

  return (
    <Sheet>
      <SheetTrigger className={triggerClassName}>Ver ventas</SheetTrigger>
      <SheetContent side="right" className="w-[92%] gap-0 overflow-y-auto bg-background p-0 sm:max-w-md">
        <SheetHeader className="gap-1 border-b border-divider p-5 pr-14">
          <SheetTitle className="text-lg font-semibold">{event.title}</SheetTitle>
          <SheetDescription>Ventas por tipo de entrada</SheetDescription>
        </SheetHeader>
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 p-5">
          <div className="flex flex-col gap-1 rounded-2xl bg-surface p-4">
            <dt className="text-[13px] text-muted-foreground">Ingresos</dt>
            <dd className="text-xl font-bold whitespace-nowrap tabular-nums">{formatPrice(stats.revenue)}</dd>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl bg-surface p-4">
            <dt className="text-[13px] text-muted-foreground">Vendidas</dt>
            <dd className="text-xl font-bold whitespace-nowrap tabular-nums">{stats.soldPct}%</dd>
          </div>
        </dl>
        <ul aria-label="Tipos de entrada" className="flex flex-col px-5">
          {event.tiers.map((tier) => (
            <li key={tier.id} className="flex flex-col gap-2 border-t border-divider py-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">{tier.name}</span>
                <span className="text-sm text-muted-foreground tabular-nums">{formatPrice(tier.price)} c/u</span>
              </div>
              <SoldBar sold={tier.sold} capacity={tier.capacity} />
              <div className="flex justify-between text-[13px] tabular-nums">
                <span>
                  <strong className="font-semibold">{number.format(tier.sold)}</strong>
                  <span className="text-muted-foreground"> / {number.format(tier.capacity)} vendidas</span>
                </span>
                <strong className="font-semibold">{formatPrice(tier.sold * tier.price)}</strong>
              </div>
            </li>
          ))}
        </ul>
        {event.catalogId && (
          <div className="mt-auto border-t border-divider p-5">
            <Link
              href={`/events/${event.catalogId}`}
              className="flex h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] border-input text-sm font-semibold text-foreground hover:border-foreground hover:text-foreground"
            >
              Ver página del evento
              <ExternalLinkIcon className="size-4" aria-hidden />
            </Link>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
