import type { AvailabilityStatus, Currency, VenueLayoutId } from "@/modules/event";

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

export type ZoneKind = "general-admission" | "numbered";

export interface VenueZone {
  id: string;
  name: string;
  /** Label used on the small (mobile) map. */
  shortName: string;
  kind: ZoneKind;
  arc: ZoneArc;
  color: string;
  textColor: string;
  /** Price multiplier over the event's `priceFrom`. */
  priceFactor: number;
  /** Seat grid for numbered zones. */
  seating?: { rows: number; seatsPerRow: number };
}

export interface VenueLayout {
  id: VenueLayoutId;
  /** Radius of the half-moon stage on the zone map. */
  stageRadius: number;
  zones: VenueZone[];
  /** How much seat rows bend around the stage: 0 = straight (tribunes), 1 = tight arc (theaters). */
  seatCurve?: number;
}

/** A zone as sold for a specific event. */
export interface ZoneTier extends VenueZone {
  price: number;
  status: AvailabilityStatus;
}

export interface Seat {
  id: string;
  row: string;
  number: number;
  /** Center of the seat in the section's SVG coordinates. */
  cx: number;
  cy: number;
  taken: boolean;
}

export interface Point {
  x: number;
  y: number;
}

export interface SeatRow {
  label: string;
  /** Where the row letter goes, just outside the first and last seat. */
  start: Point;
  end: Point;
}

export interface SeatSection {
  zoneId: string;
  width: number;
  height: number;
  /** Stage band at the top; `curve` > 0 draws its front edge as an arc. */
  stage: { x: number; y: number; width: number; height: number; curve: number };
  /** Front (closest to the stage) to back. */
  rows: SeatRow[];
  seats: Seat[];
}

export interface EventVenue {
  eventId: string;
  currency: Currency;
  layout: VenueLayout;
  tiers: ZoneTier[];
  sections: SeatSection[];
}

export interface CartLine {
  zoneId: string;
  /** Equals `seatIds.length` in numbered zones. */
  quantity: number;
  seatIds: string[];
}
