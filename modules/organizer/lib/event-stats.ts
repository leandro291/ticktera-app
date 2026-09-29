import type { OrganizerEvent, OrganizerEventStatus } from "../types/organizer-event";

export type EventStatusFilter = "all" | OrganizerEventStatus;

export interface EventStats {
  sold: number;
  capacity: number;
  revenue: number;
  /** Whole percentage of capacity sold (0–100). */
  soldPct: number;
}

export function getEventStats(event: OrganizerEvent): EventStats {
  let sold = 0;
  let capacity = 0;
  let revenue = 0;
  for (const tier of event.tiers) {
    sold += tier.sold;
    capacity += tier.capacity;
    revenue += tier.sold * tier.price;
  }
  return { sold, capacity, revenue, soldPct: capacity ? Math.round((sold / capacity) * 100) : 0 };
}

/** Dashboard summary across every event of the organizer. */
export function getOrganizerKpis(events: OrganizerEvent[]) {
  let sold = 0;
  let revenue = 0;
  for (const event of events) {
    const stats = getEventStats(event);
    sold += stats.sold;
    revenue += stats.revenue;
  }
  return { sold, revenue, published: events.filter((e) => e.status === "published").length };
}

export function filterEventsByStatus(events: OrganizerEvent[], filter: EventStatusFilter): OrganizerEvent[] {
  return filter === "all" ? events : events.filter((e) => e.status === filter);
}
