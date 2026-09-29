import type { Order } from "@/modules/purchase";

/** Local calendar date as yyyy-mm-dd. */
export const todayIso = (now = new Date()) =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

/**
 * Upcoming (event today or later, soonest first) and past (most recent first) orders.
 * Duplicated order codes keep the first occurrence.
 */
export function splitOrdersByDate(orders: Order[], today: string): { upcoming: Order[]; past: Order[] } {
  const unique = orders.filter((o, i) => orders.findIndex((other) => other.code === o.code) === i);
  return {
    upcoming: unique.filter((o) => o.event.date >= today).sort((a, b) => a.event.date.localeCompare(b.event.date)),
    past: unique.filter((o) => o.event.date < today).sort((a, b) => b.event.date.localeCompare(a.event.date)),
  };
}
