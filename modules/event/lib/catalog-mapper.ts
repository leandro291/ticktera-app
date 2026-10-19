import type { AvailabilityStatus, EventDetail } from "../types/event";
import { eventStatus, priceFromCents, tierAvailable, tierStatus } from "./availability";
import { isoToLimaDate, isoToLimaTime } from "./format";

/** One row per (event × ticket type) with its sales aggregates; `tier*` are null for an event without types. */
export interface CatalogRow {
  slug: string;
  title: string;
  categoryName: string;
  coverImageUrl: string | null;
  startsAt: Date;
  venueName: string;
  address: string | null;
  city: string;
  description: string | null;
  tierId: string | null;
  tierName: string | null;
  tierPriceCents: number | null;
  tierCapacity: number | null;
  tierMaxPerOrder: number | null;
  tierPaid: number;
  tierReserved: number;
}

/** A zone as the public sees it (no sales figures beyond what's left). */
export interface PublicTier {
  id: string;
  name: string;
  priceCents: number;
  capacity: number;
  maxPerOrder: number;
  available: number;
  status: AvailabilityStatus;
}

export const PLACEHOLDER_IMAGE = "/images/events/placeholder.png";

/** Folds the rows into events with their zones, keeping the row order (events by date, zones by sort_order). */
export function toPublicEvents(rows: CatalogRow[]): { event: EventDetail; tiers: PublicTier[] }[] {
  const bySlug = new Map<string, { row: CatalogRow; tiers: PublicTier[] }>();
  for (const row of rows) {
    const entry = bySlug.get(row.slug) ?? { row, tiers: [] };
    bySlug.set(row.slug, entry);
    if (row.tierId === null) continue;
    const capacity = row.tierCapacity ?? 0;
    const available = tierAvailable({ capacity, paid: row.tierPaid, reserved: row.tierReserved });
    entry.tiers.push({
      id: row.tierId,
      name: row.tierName ?? "",
      priceCents: row.tierPriceCents ?? 0,
      capacity,
      maxPerOrder: row.tierMaxPerOrder ?? 1,
      available,
      status: tierStatus({ capacity, available }),
    });
  }

  return [...bySlug.values()].map(({ row, tiers }) => {
    const startsAt = row.startsAt.toISOString();
    const from = priceFromCents(tiers);
    return {
      event: {
        id: row.slug,
        title: row.title,
        category: row.categoryName,
        image: row.coverImageUrl ?? PLACEHOLDER_IMAGE,
        imageAlt: `Portada de «${row.title}»`,
        date: isoToLimaDate(startsAt),
        startTime: isoToLimaTime(startsAt),
        venue: row.venueName,
        address: row.address ?? "",
        city: row.city,
        description: row.description ?? "",
        currency: "PEN",
        priceFrom: from === null ? 0 : from / 100,
        status: eventStatus(tiers),
      },
      tiers,
    };
  });
}

export function toEventDetails(rows: CatalogRow[]): EventDetail[] {
  return toPublicEvents(rows).map((e) => e.event);
}
