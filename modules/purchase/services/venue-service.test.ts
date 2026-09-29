import { describe, expect, it } from "vitest";
import { buildEventVenue } from "./venue-service";

describe("buildEventVenue", () => {
  it("AC4: reproduces the design prices and statuses for Bad Bunny", () => {
    const venue = buildEventVenue({ id: "evt-001", venueLayoutId: "stadium", priceFrom: 250, currency: "PEN", status: "available" });
    expect(venue.tiers.map((t) => [t.name, t.price, t.status])).toEqual([
      ["Campo VIP", 690, "sold-out"],
      ["Campo General", 450, "available"],
      ["Tribuna Occidente", 380, "last-tickets"],
      ["Tribuna Oriente", 320, "available"],
      ["Tribuna Norte", 250, "available"],
    ]);
  });

  it("AC5: builds a seat grid only for numbered zones, deterministically", () => {
    const event = { id: "evt-001", venueLayoutId: "stadium", priceFrom: 250, currency: "PEN", status: "available" } as const;
    const a = buildEventVenue(event);
    expect(a.sections.map((s) => s.zoneId)).toEqual(["occidente", "oriente", "norte"]);
    // Seat counts come from each zone's arc on the venue map.
    expect(a.sections[0].seats.length).toBeGreaterThan(80);
    expect(buildEventVenue(event).sections[0].seats).toEqual(a.sections[0].seats);
    expect(a.sections[0].seats.some((s) => !s.taken)).toBe(true);
  });

  it("AC4: a sold-out event has every zone sold out and every seat taken", () => {
    const venue = buildEventVenue({ id: "evt-003", venueLayoutId: "stadium", priceFrom: 80, currency: "PEN", status: "sold-out" });
    expect(venue.tiers.every((t) => t.status === "sold-out")).toBe(true);
    expect(venue.sections.every((s) => s.seats.every((seat) => seat.taken))).toBe(true);
  });

  it("AC4: the cheapest zone matches the event's price-from", () => {
    const venue = buildEventVenue({ id: "evt-004", venueLayoutId: "theater", priceFrom: 60, currency: "PEN", status: "available" });
    expect(Math.min(...venue.tiers.map((t) => t.price))).toBe(60);
  });
});
