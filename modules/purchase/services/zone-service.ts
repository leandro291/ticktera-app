import type { EventDetail } from "@/modules/event";
import { getPublicEvent } from "@/modules/event/server";
import { buildZoneLayout } from "../lib/zone-layout";
import type { EventVenue, ZoneTier } from "../types/venue";

/** Catalog AC5: evento público y sus zonas con precio (soles), cupo y estado; null según catalog D2. */
export async function getEventZones(slug: string, now = new Date()): Promise<{ event: EventDetail; venue: EventVenue } | null> {
  const found = await getPublicEvent(slug, now);
  if (!found) return null;
  const layout = buildZoneLayout(found.tiers);
  const tiers: ZoneTier[] = found.tiers.map((tier, i) => ({
    ...layout.zones[i],
    price: tier.priceCents / 100,
    status: tier.status,
    available: tier.available,
    maxPerOrder: tier.maxPerOrder,
  }));
  return { event: found.event, venue: { eventId: found.event.id, currency: "PEN", layout, tiers } };
}
