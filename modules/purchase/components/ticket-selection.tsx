"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { formatDateLong, formatDateShort, type EventSummary } from "@/modules/event";
import { useEventCart } from "../hooks/use-event-cart";
import type { EventVenue, ZoneTier } from "../types/venue";
import { GaQuantity } from "./ga-quantity";
import { OrderSummary, OrderSummaryBar } from "./order-summary";
import { ZonePicker } from "./zone-picker";

interface TicketSelectionProps {
  event: EventSummary;
  venue: EventVenue;
}

/** "Todas las zonas › Platea": the first crumb goes back to the zone step. */
function Breadcrumbs({ zone, onBack }: { zone: ZoneTier; onBack: () => void }) {
  return (
    <nav aria-label="Pasos">
      <ol className="flex items-center gap-1 text-sm">
        <li>
          <button type="button" onClick={onBack} className="flex h-8 items-center gap-1 rounded-lg pr-1.5 font-medium text-primary hover:underline">
            <ChevronLeftIcon className="size-4" aria-hidden />
            Todas las zonas
          </button>
        </li>
        <li aria-current="step" className="flex items-center gap-1 font-semibold">
          <ChevronRightIcon className="size-3.5 text-muted-foreground" aria-hidden />
          {zone.name}
        </li>
      </ol>
    </nav>
  );
}

export function TicketSelection({ event, venue }: TicketSelectionProps) {
  const cart = useEventCart(venue);
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);

  const zone = venue.tiers.find((t) => t.id === zoneId && t.status !== "sold-out");
  const continueHref = `/checkout?event=${event.id}`;

  const backToZones = () => {
    setZoneId(null);
    setHighlighted(null);
  };

  const stepHint = zone ? "Paso 2 de 2 · Elige cuántas entradas" : "Paso 1 de 2 · Elige una zona";

  return (
    <>
      <div className="flex items-center gap-3 border-b border-divider bg-background p-4 lg:hidden">
        <span className="relative size-[52px] shrink-0 overflow-hidden rounded-[14px]">
          <Image src={event.image} alt="" fill sizes="52px" className="object-cover" />
        </span>
        <div className="flex min-w-0 flex-col gap-px">
          <span className="truncate text-[15px] font-semibold">{event.title}</span>
          <span className="truncate text-[13px] text-muted-foreground">
            {formatDateShort(event.date)} · {event.venue}, {event.city}
          </span>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1440px] lg:px-20">
        <section className="hidden flex-col gap-4 pt-6 pb-7 lg:flex">
          <Link href={`/events/${event.id}`} className="flex h-8 w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary">
            <ArrowLeftIcon className="size-4" aria-hidden />
            Volver al evento
          </Link>
          <div className="flex items-center gap-4">
            <span className="relative size-16 shrink-0 overflow-hidden rounded-2xl">
              <Image src={event.image} alt="" fill sizes="64px" className="object-cover" />
            </span>
            <div className="flex flex-col gap-0.5">
              <h1 className="text-[26px] leading-tight font-bold tracking-[-0.02em]">{event.title}</h1>
              <p className="text-[15px] text-muted-foreground">
                {formatDateLong(event.date)} · {event.venue}, {event.city}
              </p>
            </div>
          </div>
        </section>
        <h1 className="sr-only lg:hidden">Entradas para {event.title}</h1>

        <div className="grid items-start gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8 lg:px-0 lg:pt-0 lg:pb-20">
          <section
            aria-labelledby="selection-title"
            className="flex min-w-0 flex-col gap-4 rounded-[22px] border border-border bg-card px-4 pt-[18px] pb-4 lg:gap-5 lg:rounded-3xl lg:px-7 lg:pt-6 lg:pb-7"
          >
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 id="selection-title" className="text-lg font-semibold max-lg:sr-only lg:text-xl">
                  Elige tus entradas
                </h2>
                <span className="text-[13px] font-medium text-muted-foreground max-lg:text-foreground">{stepHint}</span>
              </div>
              {zone && <Breadcrumbs zone={zone} onBack={backToZones} />}
            </div>

            {!zone && (
              <ZonePicker
                layout={venue.layout}
                tiers={venue.tiers}
                currency={venue.currency}
                quantityOf={cart.quantityOf}
                highlightedZoneId={highlighted}
                onHighlight={setHighlighted}
                onSelect={setZoneId}
              />
            )}

            {zone && (
              <div className="flex flex-col gap-4 motion-safe:animate-[tk-zoom-in_220ms_ease-out]">
                <GaQuantity
                  tier={zone}
                  currency={venue.currency}
                  quantity={cart.quantityOf(zone.id)}
                  max={cart.maxOf(zone.id)}
                  onChange={(q) => cart.setQuantity(zone.id, q)}
                />
                <button type="button" onClick={backToZones} className="h-12 rounded-[14px] border-[1.5px] border-input text-[15px] font-semibold hover:border-foreground lg:w-fit lg:px-6">
                  {cart.quantityOf(zone.id) ? "Listo, ver otras zonas" : "Elegir otra zona"}
                </button>
              </div>
            )}

          </section>

          <OrderSummary summary={cart.summary} currency={venue.currency} continueHref={continueHref} />
        </div>
      </div>

      <OrderSummaryBar summary={cart.summary} currency={venue.currency} continueHref={continueHref} />

    </>
  );
}
