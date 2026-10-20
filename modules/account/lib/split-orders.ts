import type { Order } from "@/modules/purchase";

const byStart = (a: Order, b: Order) =>
  a.event.date.localeCompare(b.event.date) || (a.event.startTime ?? "").localeCompare(b.event.startTime ?? "");

/**
 * Upcoming (event date >= today, soonest first) and past (most recent first) orders.
 * `today` and `event.date` are Lima calendar dates (yyyy-mm-dd). Ties keep the input order (stable sort).
 */
export function splitOrdersByDate(orders: Order[], today: string): { upcoming: Order[]; past: Order[] } {
  return {
    upcoming: orders.filter((o) => o.event.date >= today).sort(byStart),
    past: orders.filter((o) => o.event.date < today).sort((a, b) => byStart(b, a)),
  };
}
