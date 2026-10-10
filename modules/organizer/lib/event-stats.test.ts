import { describe, expect, it } from "vitest";
import type { EventDbStatus, ManagedEventItem } from "@/modules/event/types/event-list";
import { filterEvents, getOrganizerKpis, NO_FILTERS, soldPercent } from "./event-stats";

function makeEvent(
  id: string,
  status: EventDbStatus,
  sales: { sold: number; capacity: number; revenueCents: number },
): ManagedEventItem {
  return {
    id,
    slug: id,
    title: id,
    categoryName: "Música",
    coverImageUrl: null,
    startsAt: "2026-11-15T02:00:00.000Z",
    venueName: "Sede",
    city: "Lima",
    status,
    priceFromCents: null,
    sales: { ...sales, tiers: [] },
  };
}

const EVENTS = [
  makeEvent("a", "published", { sold: 312, capacity: 420, revenueCents: 2_000_000 }),
  makeEvent("b", "published", { sold: 0, capacity: 100, revenueCents: 0 }),
  makeEvent("c", "draft", { sold: 0, capacity: 0, revenueCents: 0 }),
  makeEvent("d", "cancelled", { sold: 10, capacity: 50, revenueCents: 50_000 }),
];

describe("soldPercent", () => {
  it("AC16: an event without capacity is 0% sold", () => {
    expect(soldPercent(0, 0)).toBe(0);
    expect(soldPercent(5, 0)).toBe(0);
  });

  it("AC16: no sales is 0% and the rest is rounded to a whole number", () => {
    expect(soldPercent(0, 100)).toBe(0);
    expect(soldPercent(312, 420)).toBe(74);
  });

  it("AC16: oversold is capped at 100", () => {
    expect(soldPercent(120, 100)).toBe(100);
  });
});

describe("getOrganizerKpis", () => {
  it("AC10: sums sold and revenue over every event but counts only published ones", () => {
    expect(getOrganizerKpis(EVENTS)).toEqual({ sold: 322, revenueCents: 2_050_000, published: 2 });
  });

  it("AC10: empty list gives zeros", () => {
    expect(getOrganizerKpis([])).toEqual({ sold: 0, revenueCents: 0, published: 0 });
  });

  it("AC10: KPIs come from the full list, not from the filtered rows", () => {
    const filtered = filterEvents(EVENTS, { ...NO_FILTERS, status: "draft" });
    expect(getOrganizerKpis(filtered).published).toBe(0);
    expect(getOrganizerKpis(EVENTS).published).toBe(2);
  });
});

describe("filterEvents", () => {
  const ids = (f: Partial<typeof NO_FILTERS>) => filterEvents(EVENTS, { ...NO_FILTERS, ...f }).map((e) => e.id);

  it("AC10: no filters keeps every event, including cancelled", () => {
    expect(ids({})).toHaveLength(4);
  });

  it("AC10: filters by status", () => {
    expect(ids({ status: "published" })).toEqual(["a", "b"]);
    expect(ids({ status: "draft" })).toEqual(["c"]);
  });

  it("matches the name ignoring case and accents", () => {
    const events = [{ ...EVENTS[0], title: "Festival Música Andina" }, EVENTS[1]];
    expect(filterEvents(events, { ...NO_FILTERS, query: " musica " }).map((e) => e.id)).toEqual(["a"]);
  });

  it("filters by start date in Lima time, bounds inclusive", () => {
    // 2026-11-15T02:00Z es el 14/11 a las 21:00 en Lima
    expect(ids({ from: "2026-11-14", to: "2026-11-14" })).toHaveLength(4);
    expect(ids({ from: "2026-11-15" })).toEqual([]);
    expect(ids({ to: "2026-11-13" })).toEqual([]);
  });
});
