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
}

export interface VenueLayout {
  id: VenueLayoutId;
  /** Radius of the half-moon stage on the zone map. */
  stageRadius: number;
  /** Numbered zones get their seats from their arc; general admission zones have none. */
  zones: VenueZone[];
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

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Another zone drawn faintly around the seats, so the seat map reads as a zoom of the venue map. */
export interface NeighborZone {
  zoneId: string;
  name: string;
  path: string;
  label: Point;
}

/**
 * Seat map of a numbered zone, in SVG pixels. It is the venue map scaled up: the half-moon stage sits where it is
 * on the venue, the zone keeps its ring-sector outline and the neighbouring zones give context.
 */
export interface SeatSection {
  zoneId: string;
  width: number;
  height: number;
  /** Half-moon stage: centre of its flat back wall and radius. */
  stage: { cx: number; cy: number; r: number };
  /** Ring-sector outline of this zone. */
  outline: string;
  neighbors: NeighborZone[];
  /** Area to frame when the map opens (the zone's seats). */
  focus: Box;
  /** Middle of the zone's band: the view centres here when the whole zone doesn't fit (arcs are hollow in their box). */
  anchor: Point;
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
