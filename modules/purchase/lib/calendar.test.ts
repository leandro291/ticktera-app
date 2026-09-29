import { describe, expect, it } from "vitest";
import type { Order } from "../types/order";
import { buildOrderIcs } from "./calendar";

const order: Order = {
  code: "TK-24817",
  event: { id: "evt-009", title: "Concierto Sinfónico de Año Nuevo", category: "Conciertos", image: "", date: "2026-12-31", venue: "Gran Teatro Nacional", city: "Lima, Perú" },
  currency: "PEN",
  items: [],
  total: 190,
  count: 2,
  buyerName: "Ana Pérez",
  email: "",
  paymentMethod: "card",
};

describe("buildOrderIcs", () => {
  it("AC9: creates an all-day event that ends the next day (across years)", () => {
    const ics = buildOrderIcs(order);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261231");
    expect(ics).toContain("DTEND;VALUE=DATE:20270101");
    expect(ics).toContain("UID:TK-24817@ticketera");
  });

  it("AC9: books a 3-hour event when the start time is known", () => {
    const ics = buildOrderIcs({ ...order, event: { ...order.event, startTime: "22:30" } }, new Date(Date.UTC(2026, 8, 29, 10, 5, 7)));
    expect(ics).toContain("DTSTART:20261231T223000");
    expect(ics).toContain("DTEND:20270101T013000");
    expect(ics).toContain("DTSTAMP:20260929T100507Z");
  });

  it("AC9: escapes commas in text fields", () => {
    expect(buildOrderIcs(order)).toContain("LOCATION:Gran Teatro Nacional\\, Lima\\, Perú");
  });
});
