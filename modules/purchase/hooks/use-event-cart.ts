"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { getCartSummary } from "../lib/cart-summary";
import { useCartStore } from "../store/use-cart-store";
import { zoneMax, type EventVenue } from "../types/venue";

/** Cart bound to one event: its lines (clamped to what's left), resolved summary and actions. */
export function useEventCart(venue: EventVenue) {
  const { eventId, lines, setQuantity } = useCartStore(useShallow((s) => ({ eventId: s.eventId, lines: s.lines, setQuantity: s.setQuantity })));
  const maxOf = (zoneId: string) => {
    const tier = venue.tiers.find((t) => t.id === zoneId);
    return tier ? zoneMax(tier) : 0;
  };

  // Lo guardado se recorta al cupo actual: otro comprador pudo llevarse entradas desde que se eligieron.
  const summary = useMemo(() => {
    const eventLines = eventId === venue.eventId ? Object.values(lines) : [];
    const clamped = eventLines.map((line) => {
      const tier = venue.tiers.find((t) => t.id === line.zoneId);
      return { ...line, quantity: tier ? Math.min(line.quantity, zoneMax(tier)) : 0 };
    });
    return getCartSummary(clamped, venue.tiers);
  }, [eventId, lines, venue.eventId, venue.tiers]);

  return {
    summary,
    quantityOf: (zoneId: string) => summary.items.find((i) => i.tier.id === zoneId)?.quantity ?? 0,
    maxOf,
    setQuantity: (zoneId: string, quantity: number) => setQuantity(venue.eventId, zoneId, quantity, maxOf(zoneId)),
  };
}
