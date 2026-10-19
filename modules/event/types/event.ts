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
  /** Slug: clave pública de rutas y del carrito (catalog D1). */
  id: string;
  title: string;
  /** Nombre de la categoría (tabla `categories`; hoy coincide con EVENT_CATEGORIES). */
  category: string;
  /** Portada o placeholder. */
  image: string;
  imageAlt: string;
  /** ISO date, yyyy-mm-dd, in Lima. Display strings are derived with `lib/format`. */
  date: string;
  venue: string;
  city: string;
  currency: Currency;
  /** Soles. */
  priceFrom: number;
  status: AvailabilityStatus;
}

export interface EventDetail extends EventSummary {
  /** HH:mm in Lima. */
  startTime: string;
  description: string;
  address: string;
}

export type EventSort = "date" | "price";

export type PriceRangeKey = "any" | "u50" | "50" | "150" | "300";

export interface EventFilters {
  query?: string;
  categories?: string[];
  cities?: string[];
  /** Two-digit month ("10") or "any". */
  month?: string;
  price?: PriceRangeKey;
  sort?: EventSort;
}
