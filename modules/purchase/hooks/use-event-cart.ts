"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { MAX_TICKETS_PER_ZONE } from "../data/venues";
import { getCartSummary } from "../lib/cart-summary";
import { useCartStore } from "../store/use-cart-store";
import type { EventVenue, Seat } from "../types/venue";

/** Cart bound to one event: its lines, resolved summary and actions. */
export function useEventCart(venue: EventVenue) {
  const { eventId, lines, setQuantity, toggleSeat, setSeats } = useCartStore(
    useShallow((s) => ({ eventId: s.eventId, lines: s.lines, setQuantity: s.setQuantity, toggleSeat: s.toggleSeat, setSeats: s.setSeats })),
  );
  const eventLines = useMemo(() => (eventId === venue.eventId ? lines : {}), [eventId, lines, venue.eventId]);
  const summary = useMemo(
    () => getCartSummary(Object.values(eventLines), venue.tiers, venue.sections),
    [eventLines, venue.tiers, venue.sections],
  );

  return {
    summary,
    quantityOf: (zoneId: string) => eventLines[zoneId]?.quantity ?? 0,
    seatIdsOf: (zoneId: string) => eventLines[zoneId]?.seatIds ?? [],
    isFull: (zoneId: string) => (eventLines[zoneId]?.quantity ?? 0) >= MAX_TICKETS_PER_ZONE,
    setQuantity: (zoneId: string, quantity: number) => setQuantity(venue.eventId, zoneId, quantity),
    toggleSeat: (zoneId: string, seat: Seat) => toggleSeat(venue.eventId, zoneId, seat),
    setSeats: (zoneId: string, seatIds: string[]) => setSeats(venue.eventId, zoneId, seatIds),
  };
}
