"use client";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { formatPriceCents, type ManagedEventItem } from "@/modules/event";
import { soldPercent } from "../lib/event-stats";
import { SoldBar } from "./sold-bar";

const number = new Intl.NumberFormat("es-PE");

/** "Ver ventas": per-tier breakdown of a published event. */
export function EventSalesSheet({ event, triggerClassName }: { event: ManagedEventItem; triggerClassName: string }) {
  const { sales } = event;

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
            <dd className="text-xl font-bold whitespace-nowrap tabular-nums">{formatPriceCents(sales.revenueCents)}</dd>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl bg-surface p-4">
            <dt className="text-[13px] text-muted-foreground">Vendidas</dt>
            <dd className="text-xl font-bold whitespace-nowrap tabular-nums">{soldPercent(sales.sold, sales.capacity)}%</dd>
          </div>
        </dl>
        <ul aria-label="Tipos de entrada" className="flex flex-col px-5">
          {sales.tiers.length === 0 && (
            <li className="border-t border-divider py-4 text-sm text-muted-foreground">
              Este evento no tiene tipos de entrada.
            </li>
          )}
          {sales.tiers.map((tier) => (
            <li key={tier.id} className="flex flex-col gap-2 border-t border-divider py-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">{tier.name}</span>
                <span className="text-sm text-muted-foreground tabular-nums">{formatPriceCents(tier.priceCents)} c/u</span>
              </div>
              <SoldBar sold={tier.sold} capacity={tier.capacity} />
              <div className="flex justify-between text-[13px] tabular-nums">
                <span>
                  <strong className="font-semibold">{number.format(tier.sold)}</strong>
                  <span className="text-muted-foreground"> / {number.format(tier.capacity)} vendidas</span>
                </span>
                <strong className="font-semibold">{formatPriceCents(tier.revenueCents)}</strong>
              </div>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
