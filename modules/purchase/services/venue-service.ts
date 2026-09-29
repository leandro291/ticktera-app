import type { EventDetail } from "@/modules/event";
import { VENUE_LAYOUTS, ZONE_STATUS_OVERRIDES } from "../data/venues";
import { buildSeatSection } from "../lib/seat-layout";
import type { EventVenue, SeatSection, ZoneTier } from "../types/venue";

const roundTo5 = (n: number) => Math.round(n / 5) * 5;

export function buildEventVenue(event: Pick<EventDetail, "id" | "venueLayoutId" | "priceFrom" | "currency" | "status">): EventVenue {
  const layout = VENUE_LAYOUTS[event.venueLayoutId];
  const overrides = ZONE_STATUS_OVERRIDES[event.id] ?? {};
  const cheapest = Math.min(...layout.zones.map((z) => z.priceFactor));

  const tiers: ZoneTier[] = layout.zones.map((zone) => ({
    ...zone,
    price: roundTo5(event.priceFrom * zone.priceFactor),
    status:
      event.status === "sold-out"
        ? "sold-out"
        : (overrides[zone.id] ?? (event.status === "last-tickets" && zone.priceFactor === cheapest ? "last-tickets" : "available")),
  }));

  const sections: SeatSection[] = tiers
    .filter((t) => t.kind === "numbered" && t.seating)
    .map((t) => buildSeatSection(event.id, t.id, t.seating!, t.status, layout.seatCurve));

  return { eventId: event.id, currency: event.currency, layout, tiers, sections };
}

// Async to mirror the future API call.
export async function getEventVenue(event: EventDetail): Promise<EventVenue> {
  return buildEventVenue(event);
}
