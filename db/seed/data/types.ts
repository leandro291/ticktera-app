// Shapes of the mock catalog the seed loads (the app reads events from the database).

export interface MockEventSummary {
  id: string;
  title: string;
  category: string;
  image: string;
  imageAlt: string;
  date: string; // yyyy-mm-dd
  venue: string;
  city: string;
  currency: "PEN" | "USD" | "EUR";
  priceFrom: number; // soles
  status: "available" | "last-tickets" | "sold-out";
}

export interface MockEventDetailFields {
  startTime: string;
  doorsTime: string;
  minAge: string;
  description: string;
  address: string;
  venueLayoutId: "stadium" | "theater";
}

export interface MockVenueZone {
  id: string;
  name: string;
  shortName: string;
  kind: "general-admission" | "numbered";
  arc: { inner: number; outer: number; from: number; to: number };
  color: string;
  textColor: string;
  /** Price multiplier over the event's `priceFrom`. */
  priceFactor: number;
}

export interface MockVenueLayout {
  id: "stadium" | "theater";
  stageRadius: number;
  zones: MockVenueZone[];
}
