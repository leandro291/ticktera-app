import type { AvailabilityStatus, Currency, VenueLayoutId } from "@/modules/event";

/** Position on the zone map, in percent of the map's width/height. */
export interface MapRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ZoneKind = "general-admission" | "numbered";

export interface VenueZone {
  id: string;
  name: string;
  /** Label used on the small (mobile) map. */
  shortName: string;
  kind: ZoneKind;
  shape: MapRect;
  color: string;
  textColor: string;
  /** Price multiplier over the event's `priceFrom`. */
  priceFactor: number;
  /** Seat grid for numbered zones. */
  seating?: { rows: number; seatsPerRow: number };
}

export interface VenueLayout {
  id: VenueLayoutId;
  stage: MapRect;
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
