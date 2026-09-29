"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { formatDateLong, formatDateShort, formatPrice, type EventSummary } from "@/modules/event";
import { MAX_TICKETS_PER_ZONE } from "../data/venues";
import { useEventCart } from "../hooks/use-event-cart";
import type { EventVenue, Seat, ZoneTier } from "../types/venue";
import { GaQuantity } from "./ga-quantity";
import { OrderSummary, OrderSummaryBar } from "./order-summary";
import { SeatMap } from "./seat-map";
import { BestSeatsPicker, SeatChips } from "./seat-chips";
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
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);

  const zone = venue.tiers.find((t) => t.id === zoneId && t.status !== "sold-out");
  const section = zone?.kind === "numbered" ? venue.sections.find((s) => s.zoneId === zone.id) : undefined;
  const selectedSeats = (tier: ZoneTier) => cart.summary.items.find((i) => i.tier.id === tier.id)?.seats ?? [];
  const continueHref = `/checkout?event=${event.id}`;

  const backToZones = () => {
    setZoneId(null);
    setHighlighted(null);
  };

  // On phones the seat map opens full screen; everything else stays inline.
  const seatSheetOpen = !isDesktop && Boolean(section);

  const seatCounter = (tier: ZoneTier) => (
    <span aria-live="polite" className="text-[13px] text-muted-foreground tabular-nums">
      {cart.quantityOf(tier.id)} de {MAX_TICKETS_PER_ZONE} butacas
    </span>
  );

  const seatTools = (tier: ZoneTier, className?: string) =>
    section && (
      <div className={cn("flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-6", className)}>
        <SeatChips seats={selectedSeats(tier)} onRemove={(seat: Seat) => cart.toggleSeat(tier.id, seat)} className="lg:pt-1.5" />
        <BestSeatsPicker section={section} selectedSeatIds={cart.seatIdsOf(tier.id)} onPick={(ids) => cart.setSeats(tier.id, ids)} className="shrink-0" />
      </div>
    );

  const seatMap = (tier: ZoneTier, framing: "overview" | "touch", className?: string) =>
    section && (
      <SeatMap
        key={tier.id}
        tier={tier}
        section={section}
        currency={venue.currency}
        selectedSeatIds={cart.seatIdsOf(tier.id)}
        atLimit={cart.isFull(tier.id)}
        onToggle={(seat) => cart.toggleSeat(tier.id, seat)}
        framing={framing}
        className={className}
      />
    );

  const stepHint = !zone
    ? "Paso 1 de 2 · Elige una zona"
    : zone.kind === "numbered"
      ? "Paso 2 de 2 · Elige tus butacas"
      : "Paso 2 de 2 · Elige cuántas entradas";

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
              {zone && !seatSheetOpen && <Breadcrumbs zone={zone} onBack={backToZones} />}
            </div>

            {(!zone || seatSheetOpen) && (
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

            {zone?.kind === "general-admission" && (
              <div className="flex flex-col gap-4 motion-safe:animate-[tk-zoom-in_220ms_ease-out]">
                <GaQuantity tier={zone} currency={venue.currency} quantity={cart.quantityOf(zone.id)} onChange={(q) => cart.setQuantity(zone.id, q)} />
                <button type="button" onClick={backToZones} className="h-12 rounded-[14px] border-[1.5px] border-input text-[15px] font-semibold hover:border-foreground lg:w-fit lg:px-6">
                  {cart.quantityOf(zone.id) ? "Listo, ver otras zonas" : "Elegir otra zona"}
                </button>
              </div>
            )}

            {zone?.kind === "numbered" && isDesktop && (
              <div className="flex flex-col gap-4 motion-safe:animate-[tk-zoom-in_260ms_ease-out]">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[15px]">
                    <strong className="font-semibold">{zone.name}</strong>
                    <span className="text-muted-foreground"> · {formatPrice(zone.price, venue.currency)} c/u</span>
                  </span>
                  {seatCounter(zone)}
                </div>
                {seatMap(zone, "overview")}
                {seatTools(zone, "border-t border-divider pt-4")}
              </div>
            )}
          </section>

          <OrderSummary summary={cart.summary} currency={venue.currency} continueHref={continueHref} />
        </div>
      </div>

      <OrderSummaryBar summary={cart.summary} currency={venue.currency} continueHref={continueHref} />

      <Sheet open={seatSheetOpen} onOpenChange={(open) => !open && backToZones()}>
        <SheetContent side="bottom" showCloseButton={false} className="gap-0 bg-background p-0 data-[side=bottom]:h-dvh">
          {zone && section && (
            <>
              <SheetHeader className="shrink-0 flex-row items-center justify-between gap-2 border-b border-divider py-2 pr-3 pl-2">
                <div className="flex min-w-0 flex-col">
                  <SheetClose className="flex h-8 w-fit items-center gap-1 rounded-lg px-1.5 text-sm font-medium text-primary">
                    <ChevronLeftIcon className="size-4" aria-hidden />
                    Todas las zonas
                  </SheetClose>
                  <SheetTitle className="px-1.5 text-base font-semibold">
                    {zone.name} · {formatPrice(zone.price, venue.currency)}
                  </SheetTitle>
                  <SheetDescription className="sr-only">Elige tus butacas en el mapa.</SheetDescription>
                </div>
                {seatCounter(zone)}
              </SheetHeader>
              <div className="flex min-h-0 grow flex-col p-3">{seatMap(zone, "touch", "grow")}</div>
              <SheetFooter className="gap-3 border-t border-divider px-4 pt-3 pb-5">
                {seatTools(zone)}
                <SheetClose className="h-[52px] rounded-[14px] bg-strong text-[15px] font-semibold text-white">Listo</SheetClose>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
