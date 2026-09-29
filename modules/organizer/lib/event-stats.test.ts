import { describe, expect, it } from "vitest";
import { ORGANIZER_EVENTS } from "../data/organizer-events";
import { filterEventsByStatus, getEventStats, getOrganizerKpis } from "./event-stats";

describe("getEventStats", () => {
  it("AC12: sums sold, capacity and revenue across tiers", () => {
    expect(getEventStats(ORGANIZER_EVENTS[1])).toEqual({ sold: 312, capacity: 420, revenue: 200 * 90 + 112 * 60, soldPct: 74 });
  });

  it("AC12: an event without capacity is 0% sold", () => {
    expect(getEventStats({ ...ORGANIZER_EVENTS[3], tiers: [] }).soldPct).toBe(0);
  });
});

describe("getOrganizerKpis", () => {
  it("AC12: totals the design's sample events (3 published, 1 draft)", () => {
    const kpis = getOrganizerKpis(ORGANIZER_EVENTS);
    expect(kpis.sold).toBe(7420 + 312 + 414);
    expect(kpis.published).toBe(3);
  });
});

describe("filterEventsByStatus", () => {
  it("AC12: filters by status; 'all' keeps every event", () => {
    expect(filterEventsByStatus(ORGANIZER_EVENTS, "all")).toHaveLength(4);
    expect(filterEventsByStatus(ORGANIZER_EVENTS, "draft").map((e) => e.id)).toEqual(["org-004"]);
    expect(filterEventsByStatus(ORGANIZER_EVENTS, "published")).toHaveLength(3);
  });
});
