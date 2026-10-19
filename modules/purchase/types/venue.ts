import type { AvailabilityStatus, Currency } from "@/modules/event";

/**
 * A zone on the venue map: a ring sector around the half-moon stage. Radii are in map units (the map is 1000 wide),
 * angles in degrees: 0° points straight at the audience, negative angles go to the stage's left.
 */
export interface ZoneArc {
  inner: number;
  outer: number;
  from: number;
  to: number;
}

export interface VenueZone {
  id: string; // ticket_types.id
  name: string;
  /** Label used on the small (mobile) map. */
  shortName: string;
  arc: ZoneArc;
  color: string;
  textColor: string;
}

/** Map of zones, generated from the event's ticket types (buildZoneLayout). */
export interface VenueLayout {
  /** Radius of the half-moon stage on the zone map. */
  stageRadius: number;
  zones: VenueZone[];
}

/** A zone as sold for a specific event: general admission, priced in soles, with what's left. */
export interface ZoneTier extends VenueZone {
  price: number;
  status: AvailabilityStatus;
  available: number;
  maxPerOrder: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface EventVenue {
  eventId: string; // slug
  currency: Currency;
  layout: VenueLayout;
  tiers: ZoneTier[];
}

export interface CartLine {
  zoneId: string;
  quantity: number;
}

/** Most tickets of a zone in one order: its per-order limit, capped by what's left. */
export const zoneMax = (tier: Pick<ZoneTier, "maxPerOrder" | "available">) => Math.max(0, Math.min(tier.maxPerOrder, tier.available));
