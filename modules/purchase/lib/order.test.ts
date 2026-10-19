import { describe, expect, it } from "vitest";
import type { Order } from "../types/order";
import { formatOrderSeats, getOrderTickets } from "./order";

const order: Order = {
  code: "TK-12345",
  event: {
    id: "evt-001",
    title: "Bad Bunny — World Tour",
    category: "Conciertos",
    image: "/images/events/bad-bunny-world-tour.jpg",
    date: "2026-11-14",
    startTime: "21:00",
    venue: "Estadio Nacional",
    city: "Lima",
  },
  currency: "PEN",
  items: [
    { zoneName: "Campo General", quantity: 2, seats: [], amount: 900 },
    { zoneName: "Tribuna Norte", quantity: 2, seats: [], amount: 500 },
  ],
  total: 1400,
  count: 4,
  buyerName: "Ana Pérez",
  email: "ana@mail.com",
  paymentMethod: "card",
};

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
