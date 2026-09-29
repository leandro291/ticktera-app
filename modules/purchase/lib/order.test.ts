import { describe, expect, it } from "vitest";
import type { EventSummary } from "@/modules/event";
import { buildEventVenue } from "../services/venue-service";
import { getCartSummary } from "./cart-summary";
import { createOrder, generateOrderCode } from "./order";

const event: EventSummary = {
  id: "evt-001",
  title: "Bad Bunny — World Tour",
  category: "Conciertos",
  image: "/images/events/bad-bunny-world-tour.jpg",
  imageAlt: "",
  date: "2026-11-14",
  venue: "Estadio Nacional",
  city: "Lima",
  currency: "PEN",
  priceFrom: 250,
  status: "available",
};

describe("createOrder", () => {
  it("AC9: snapshots the paid cart with seat labels and totals", () => {
    const venue = buildEventVenue({ ...event, venueLayoutId: "stadium" });
    const [a, b] = venue.sections.find((s) => s.zoneId === "norte")!.seats;
    const summary = getCartSummary(
      [
        { zoneId: "general", quantity: 2, seatIds: [] },
        { zoneId: "norte", quantity: 2, seatIds: [a.id, b.id] },
      ],
      venue.tiers,
      venue.sections,
    );
    const order = createOrder({ code: "TK-12345", event, summary, email: "ana@mail.com", paymentMethod: "card" });

    expect(order.items).toEqual([
      { zoneName: "Campo General", quantity: 2, seatLabel: undefined, amount: 900 },
      { zoneName: "Tribuna Norte", quantity: 2, seatLabel: `Fila A · ${a.number}, ${b.number}`, amount: 500 },
    ]);
    expect(order).toMatchObject({ code: "TK-12345", total: 1400, count: 4, currency: "PEN", email: "ana@mail.com" });
    expect(order.event).toEqual({
      id: "evt-001",
      title: event.title,
      category: "Conciertos",
      image: event.image,
      date: "2026-11-14",
      venue: "Estadio Nacional",
      city: "Lima",
    });
  });

  it("AC9: order codes look like TK-NNNNN", () => {
    expect(generateOrderCode(() => 0)).toBe("TK-10000");
    expect(generateOrderCode()).toMatch(/^TK-\d{5}$/);
  });
});
