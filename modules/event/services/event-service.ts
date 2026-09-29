import { EVENT_DETAILS } from "../data/event-details";
import { EVENTS, FEATURED_EVENT_IDS, PRICE_RANGES } from "../data/events";
import type { EventDetail, EventFilters, EventSummary } from "../types/event";

const normalize = (value: string) =>
  value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

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

// Async to mirror the future API call.
export async function getEvents(filters?: EventFilters): Promise<EventSummary[]> {
  return filterEvents(EVENTS, filters);
}

export async function getFeaturedEvents(): Promise<EventSummary[]> {
  return FEATURED_EVENT_IDS.map((id) => EVENTS.find((e) => e.id === id)).filter(
    (e): e is EventSummary => Boolean(e),
  );
}

export async function getEventById(id: string): Promise<EventDetail | null> {
  const event = EVENTS.find((e) => e.id === id);
  const details = EVENT_DETAILS[id];
  return event && details ? { ...event, ...details } : null;
}

/** Same category first, then the closest dates; never the event itself. */
export async function getRelatedEvents(event: EventSummary, limit = 4): Promise<EventSummary[]> {
  return EVENTS.filter((e) => e.id !== event.id)
    .sort((a, b) => Number(b.category === event.category) - Number(a.category === event.category) || a.date.localeCompare(b.date))
    .slice(0, limit);
}
