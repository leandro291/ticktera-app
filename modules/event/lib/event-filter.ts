import type { EventFilters, EventSummary, PriceRangeKey } from "../types/event";

export const PRICE_RANGES: { key: PriceRangeKey; label: string; min: number; max: number }[] = [
  { key: "any", label: "Cualquier precio", min: -1, max: Infinity },
  { key: "u50", label: "Hasta S/ 50", min: -1, max: 50 },
  { key: "50", label: "S/ 50 – 150", min: 50, max: 150 },
  { key: "150", label: "S/ 150 – 300", min: 150, max: 300 },
  { key: "300", label: "Más de S/ 300", min: 300, max: Infinity },
];

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"];

export const MONTH_OPTIONS = [
  { key: "any", label: "Cualquier fecha" },
  ...MONTHS.map((label, i) => ({ key: String(i + 1).padStart(2, "0"), label })),
];

const normalize = (value: string) =>
  value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Text, category, city, month and price filters plus sort; runs on the client over the whole list (catalog D10). */
export function filterEvents(events: EventSummary[], filters: EventFilters = {}): EventSummary[] {
  const { query, categories = [], cities = [], month = "any", price = "any", sort = "date" } = filters;
  const range = PRICE_RANGES.find((r) => r.key === price) ?? PRICE_RANGES[0];
  const needle = query ? normalize(query.trim()) : "";

  return events
    .filter(
      (e) =>
        (!needle || normalize(`${e.title} ${e.venue} ${e.city}`).includes(needle)) &&
        (!categories.length || categories.includes(e.category)) &&
        (!cities.length || cities.includes(e.city)) &&
        (month === "any" || e.date.slice(5, 7) === month) &&
        e.priceFrom > range.min &&
        e.priceFrom <= range.max,
    )
    .sort((a, b) => (sort === "price" ? a.priceFrom - b.priceFrom : a.date.localeCompare(b.date)));
}

/** Catalog D8: no "featured" flag, so the next upcoming events. */
export function pickFeatured(events: EventSummary[], limit = 5): EventSummary[] {
  return [...events].sort((a, b) => a.date.localeCompare(b.date)).slice(0, limit);
}

/** Same category first, then the closest dates; never the event itself. */
export function pickRelated(event: EventSummary, events: EventSummary[], limit = 4): EventSummary[] {
  return events
    .filter((e) => e.id !== event.id)
    .sort((a, b) => Number(b.category === event.category) - Number(a.category === event.category) || a.date.localeCompare(b.date))
    .slice(0, limit);
}

/** Cities of the listed events, alphabetically (catalog D3). */
export function cityOptions(events: EventSummary[]): string[] {
  return [...new Set(events.map((e) => e.city))].sort((a, b) => a.localeCompare(b, "es"));
}
