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

  it("AC9: escapes commas in text fields", () => {
    expect(buildOrderIcs(order)).toContain("LOCATION:Gran Teatro Nacional\\, Lima\\, Perú");
  });
});
