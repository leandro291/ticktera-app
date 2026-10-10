import { isoToLimaDate } from "@/modules/event/lib/format";
import type { ManagedEventItem } from "@/modules/event/types/event-list";

export type EventStatusFilter = "all" | "published" | "draft";

/** Whole percentage of capacity sold (0–100). No capacity → 0; oversold is capped at 100. */
export function soldPercent(sold: number, capacity: number): number {
  return capacity > 0 ? Math.min(100, Math.round((sold / capacity) * 100)) : 0;
}

/** Dashboard summary over the same list the rows render, regardless of the status filter. */
export function getOrganizerKpis(events: ManagedEventItem[]) {
  let sold = 0;
  let revenueCents = 0;
  let published = 0;
  for (const event of events) {
    sold += event.sales.sold;
    revenueCents += event.sales.revenueCents;
    if (event.status === "published") published++;
  }
  return { sold, revenueCents, published };
}

export interface EventFilters {
  status: EventStatusFilter;
  query: string;
  from: string; // "yyyy-mm-dd" (Lima) o ""
  to: string; // idem, inclusivo
}

export const NO_FILTERS: EventFilters = { status: "all", query: "", from: "", to: "" };

const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** Estado, nombre (sin mayúsculas ni tildes) y rango de fecha de inicio en hora de Lima; todos opcionales. */
export function filterEvents(events: ManagedEventItem[], { status, query, from, to }: EventFilters): ManagedEventItem[] {
  const q = fold(query.trim());
  return events.filter((e) => {
    if (status !== "all" && e.status !== status) return false;
    if (q && !fold(e.title).includes(q)) return false;
    const day = isoToLimaDate(e.startsAt);
    return (!from || day >= from) && (!to || day <= to);
  });
}
