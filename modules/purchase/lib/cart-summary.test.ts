import { describe, expect, it } from "vitest";
import { buildEventVenue } from "../services/venue-service";
import { formatSeatList, formatTicketCount, getCartSummary } from "./cart-summary";

const venue = buildEventVenue({ id: "evt-001", venueLayoutId: "stadium", priceFrom: 250, currency: "PEN", status: "available" });
const seatsOf = (zoneId: string) => venue.sections.find((s) => s.zoneId === zoneId)!.seats;

describe("getCartSummary", () => {
  it("AC7: an empty cart has no items and zero total", () => {
    expect(getCartSummary([], venue.tiers, venue.sections)).toEqual({ items: [], total: 0, count: 0 });
  });

  it("AC7: adds up general admission and numbered seats in map order", () => {
    const [s1, s2] = seatsOf("norte").slice(0, 2);
    const summary = getCartSummary(
      [
        { zoneId: "norte", quantity: 2, seatIds: [s2.id, s1.id] },
        { zoneId: "general", quantity: 2, seatIds: [] },
      ],
      venue.tiers,
      venue.sections,
    );
    expect(summary.items.map((i) => i.tier.name)).toEqual(["Campo General", "Tribuna Norte"]);
    expect(summary.items[1].seats.map((s) => s.number)).toEqual([1, 2]);
    expect(summary.total).toBe(2 * 450 + 2 * 250);
    expect(summary.count).toBe(4);
  });
});

describe("formatting", () => {
  it("AC7: groups seats by row", () => {
    const seats = [
      { id: "a", row: "D", number: 4, cx: 0, cy: 0, taken: false },
      { id: "b", row: "C", number: 13, cx: 0, cy: 0, taken: false },
      { id: "c", row: "C", number: 12, cx: 0, cy: 0, taken: false },
    ];
    expect(formatSeatList(seats)).toBe("Fila C · 12, 13 · Fila D · 4");
  });

  it("AC7: pluralizes the ticket count", () => {
    expect(formatTicketCount(1)).toBe("1 entrada");
    expect(formatTicketCount(3)).toBe("3 entradas");
  });
});
