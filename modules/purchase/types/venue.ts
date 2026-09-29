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
  x: number;
  y: number;
  taken: boolean;
}

export interface SeatSection {
  zoneId: string;
  width: number;
  height: number;
  rows: { label: string; y: number }[];
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
