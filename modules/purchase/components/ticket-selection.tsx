"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeftIcon, XIcon } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { formatDateLong, formatDateShort, type EventSummary } from "@/modules/event";
import { MAX_TICKETS_PER_ZONE } from "../data/venues";
import { useEventCart } from "../hooks/use-event-cart";
import { formatSeatList } from "../lib/cart-summary";
import type { EventVenue, ZoneTier } from "../types/venue";
import { OrderSummary, OrderSummaryBar } from "./order-summary";
import { SeatMap } from "./seat-map";
import { TicketTierList } from "./ticket-tier-list";
import { ZoneMap } from "./zone-map";

interface TicketSelectionProps {
  event: EventSummary;
  venue: EventVenue;
}

const CHECKOUT_HREF = "/checkout";

export function TicketSelection({ event, venue }: TicketSelectionProps) {
  const cart = useEventCart(venue);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(
    () => venue.tiers.find((t) => t.status !== "sold-out")?.id ?? null,
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const seatPanelRef = useRef<HTMLDivElement>(null);

  const selectedTier = venue.tiers.find((t) => t.id === selectedZoneId);
  const numberedTier = selectedTier?.kind === "numbered" && selectedTier.status !== "sold-out" ? selectedTier : undefined;
  const section = venue.sections.find((s) => s.zoneId === numberedTier?.id);

  const pickZone = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    const tier = venue.tiers.find((t) => t.id === zoneId);
    if (tier?.kind === "numbered" && !isDesktop) setSheetOpen(true);
  };

  const pickSeats = (zoneId: string) => {
    pickZone(zoneId);
    if (isDesktop) requestAnimationFrame(() => seatPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

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

  const seatCounter = (tier: ZoneTier) => (
    <span aria-live="polite" className="text-[13px] text-muted-foreground">
      {cart.quantityOf(tier.id)} de {MAX_TICKETS_PER_ZONE} butacas
    </span>
  );

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

        <div className="grid items-start gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-8 lg:px-0 lg:pt-0 lg:pb-20">
          <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
            <section className="flex flex-col gap-3.5 rounded-[22px] border border-border bg-card px-4 pt-[18px] pb-4 lg:gap-[18px] lg:rounded-3xl lg:px-7 lg:pt-6 lg:pb-7">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-semibold lg:text-xl">Elige tu zona</h2>
                <span className="text-xs text-muted-foreground lg:text-[13px]">
                  Toca una zona<span className="hidden lg:inline"> del mapa</span>
                </span>
              </div>
              <ZoneMap
                layout={venue.layout}
                tiers={venue.tiers}
                currency={venue.currency}
                selectedZoneId={selectedZoneId}
                onSelect={pickZone}
              />

              {numberedTier && (
                <div ref={seatPanelRef} className="hidden flex-col gap-3 border-t border-divider pt-5 lg:flex">
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="text-base font-semibold">{numberedTier.name} · elige tus butacas</h3>
                    {seatCounter(numberedTier)}
                  </div>
                  {isDesktop && seatMap(numberedTier, "overview")}
                </div>
              )}
            </section>

            <TicketTierList
              tiers={venue.tiers}
              currency={venue.currency}
              selectedZoneId={selectedZoneId}
              quantityOf={cart.quantityOf}
              onQuantityChange={(zoneId, quantity) => {
                setSelectedZoneId(zoneId);
                cart.setQuantity(zoneId, quantity);
              }}
              onPickSeats={pickSeats}
            />
          </div>

          <OrderSummary summary={cart.summary} currency={venue.currency} continueHref={CHECKOUT_HREF} />
        </div>
      </div>

      <OrderSummaryBar summary={cart.summary} currency={venue.currency} continueHref={CHECKOUT_HREF} />

      <Sheet open={sheetOpen && !isDesktop && Boolean(numberedTier)} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" showCloseButton={false} className="gap-0 bg-background p-0 data-[side=bottom]:h-dvh">
          {numberedTier && (
            <>
              <SheetHeader className="h-16 shrink-0 flex-row items-center justify-between border-b border-divider pr-2 pl-4">
                <div className="flex flex-col">
                  <SheetTitle className="text-base font-semibold">{numberedTier.name}</SheetTitle>
                  {seatCounter(numberedTier)}
                </div>
                <SheetClose aria-label="Cerrar mapa de butacas" className="flex size-11 items-center justify-center rounded-xl hover:bg-muted">
                  <XIcon className="size-[22px]" aria-hidden />
                </SheetClose>
              </SheetHeader>
              <div className="flex grow flex-col p-4">{seatMap(numberedTier, "touch", "grow")}</div>
              <SheetFooter className="flex-row items-center gap-3 border-t border-divider px-4 pt-3 pb-5">
                <p className="grow text-[13px] text-muted-foreground">
                  {(() => {
                    const seats = cart.summary.items.find((i) => i.tier.id === numberedTier.id)?.seats ?? [];
                    return seats.length ? formatSeatList(seats) : "Toca las butacas libres para elegirlas.";
                  })()}
                </p>
                <SheetClose className="h-[52px] shrink-0 rounded-[14px] bg-strong px-6 text-[15px] font-semibold text-white">Listo</SheetClose>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
