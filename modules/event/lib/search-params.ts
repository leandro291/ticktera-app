import { MONTH_OPTIONS, PRICE_RANGES } from "../data/events";
import { EVENT_CATEGORIES, type EventCategory, type PriceRangeKey } from "../types/event";

type RawParams = Record<string, string | string[] | undefined>;

const asList = (value: string | string[] | undefined) => (value === undefined ? [] : Array.isArray(value) ? value : [value]);
const oneOf = <T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

/** Parses `/events?q=&category=&city=&month=&price=` into the search screen's initial state. */
export function parseEventSearchParams(params: RawParams) {
  return {
    query: asList(params.q)[0] ?? "",
    filters: {
      categories: asList(params.category).filter((c): c is EventCategory => (EVENT_CATEGORIES as readonly string[]).includes(c)),
      cities: asList(params.city),
      month: oneOf(asList(params.month)[0], MONTH_OPTIONS.map((m) => m.key), "any"),
      price: oneOf<PriceRangeKey>(asList(params.price)[0], PRICE_RANGES.map((p) => p.key), "any"),
    },
  };
}
