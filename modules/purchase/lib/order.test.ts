import { describe, expect, it } from "vitest";
import type { EventSummary } from "@/modules/event";
import type { ZoneTier } from "../types/venue";
import { getCartSummary } from "./cart-summary";
import { createOrder, formatOrderSeats, generateOrderCode, getOrderTickets } from "./order";
import { buildZoneLayout } from "./zone-layout";

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

const tiers: ZoneTier[] = buildZoneLayout([
  { id: "general", name: "Campo General" },
  { id: "norte", name: "Tribuna Norte" },
]).zones.map((zone, i) => ({ ...zone, price: [450, 250][i], status: "available", available: 100, maxPerOrder: 6 }));
const summary = getCartSummary(
  [
    { zoneId: "general", quantity: 2 },
    { zoneId: "norte", quantity: 2 },
  ],
  tiers,
);
const order = createOrder({
  code: "TK-12345",
  event: { ...event, startTime: "21:00" },
  summary,
  buyerName: "Ana Pérez",
  email: "ana@mail.com",
  paymentMethod: "card",
});

describe("createOrder", () => {
  it("AC9: snapshots the paid cart by zone, without seats, and totals", () => {
    expect(order.items).toEqual([
      { zoneName: "Campo General", quantity: 2, seats: [], amount: 900 },
      { zoneName: "Tribuna Norte", quantity: 2, seats: [], amount: 500 },
    ]);
    expect(order).toMatchObject({ code: "TK-12345", total: 1400, count: 4, currency: "PEN", buyerName: "Ana Pérez", email: "ana@mail.com" });
    expect(order.event).toEqual({
      id: "evt-001",
      title: event.title,
      category: "Conciertos",
      image: event.image,
      date: "2026-11-14",
      startTime: "21:00",
      venue: "Estadio Nacional",
      city: "Lima",
    });
  });

  it("AC9: order codes look like TK-NNNNN", () => {
    expect(generateOrderCode(() => 0)).toBe("TK-10000");
    expect(generateOrderCode()).toMatch(/^TK-\d{5}$/);
  });
});

describe("tickets", () => {
  it("AC11: expands one ticket per unit with its zone and code", () => {
    expect(getOrderTickets(order)).toEqual([
      { code: "TK-12345-01", zoneName: "Campo General", seat: undefined },
      { code: "TK-12345-02", zoneName: "Campo General", seat: undefined },
      { code: "TK-12345-03", zoneName: "Tribuna Norte", seat: undefined },
      { code: "TK-12345-04", zoneName: "Tribuna Norte", seat: undefined },
    ]);
  });

  it("AC9: groups seats by row", () => {
    expect(formatOrderSeats([{ row: "D", number: 4 }, { row: "C", number: 13 }, { row: "C", number: 12 }])).toBe("Fila C · 12, 13 · Fila D · 4");
  });
});
