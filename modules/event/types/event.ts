export const EVENT_CATEGORIES = [
  "Conciertos",
  "Deportes",
  "Teatro",
  "Festivales",
  "Familiar",
  "Cine",
  "Comedia",
  "Arte y Exposiciones",
] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export type AvailabilityStatus = "available" | "last-tickets" | "sold-out";

export type Currency = "PEN" | "USD" | "EUR";

export interface EventSummary {
  id: string;
  title: string;
  category: EventCategory;
  image: string;
  imageAlt: string;
  /** ISO date, yyyy-mm-dd. Display strings are derived with `lib/format`. */
  date: string;
  venue: string;
  city: string;
  currency: Currency;
  priceFrom: number;
  status: AvailabilityStatus;
}

export type VenueLayoutId = "stadium" | "theater";

export interface EventDetail extends EventSummary {
  startTime: string;
  doorsTime: string;
  minAge: string;
  description: string;
  address: string;
  venueLayoutId: VenueLayoutId;
}

export type EventSort = "date" | "price";

export type PriceRangeKey = "any" | "u50" | "50" | "150" | "300";

export interface EventFilters {
  query?: string;
  categories?: EventCategory[];
  cities?: string[];
  /** Two-digit month ("10") or "any". */
  month?: string;
  price?: PriceRangeKey;
  sort?: EventSort;
}
