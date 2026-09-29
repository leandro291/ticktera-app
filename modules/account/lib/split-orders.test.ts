import { describe, expect, it } from "vitest";
import type { Order } from "@/modules/purchase";
import { SAMPLE_ORDERS } from "../data/sample-orders";
import { splitOrdersByDate, todayIso } from "./split-orders";

const withDate = (code: string, date: string): Order => ({ ...SAMPLE_ORDERS[0], code, event: { ...SAMPLE_ORDERS[0].event, date } });

describe("splitOrdersByDate", () => {
  it("AC11: the design's sample orders are both upcoming, soonest first", () => {
    const { upcoming, past } = splitOrdersByDate(SAMPLE_ORDERS, "2026-09-29");
    expect(upcoming.map((o) => o.code)).toEqual(["TK-24790", "TK-24817"]);
    expect(past).toEqual([]);
  });

  it("AC11: events before today are past (most recent first); today's event is still upcoming", () => {
    const orders = [withDate("A", "2026-01-10"), withDate("B", "2026-09-29"), withDate("C", "2026-05-01")];
    const { upcoming, past } = splitOrdersByDate(orders, "2026-09-29");
    expect(upcoming.map((o) => o.code)).toEqual(["B"]);
    expect(past.map((o) => o.code)).toEqual(["C", "A"]);
  });

  it("AC11: ignores duplicated order codes", () => {
    expect(splitOrdersByDate([...SAMPLE_ORDERS, SAMPLE_ORDERS[0]], "2026-09-29").upcoming).toHaveLength(2);
  });

  it("formats today as a local ISO date", () => {
    expect(todayIso(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
