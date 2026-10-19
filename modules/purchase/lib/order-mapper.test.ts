import { describe, expect, it } from "vitest";
import { PLACEHOLDER_IMAGE } from "@/modules/event";
import { toOrder, type OrderRows } from "./order-mapper";

const rows: OrderRows = {
  order: { code: "TK-K7M2Q", status: "paid", totalCents: 95050 },
  event: {
    slug: "rock-en-lima",
    title: "Rock en Lima",
    categoryName: "Conciertos",
    coverImageUrl: "https://blob.example/cover.png",
    // 2026-12-06 02:30 UTC = 5 de diciembre, 21:30 en Lima
    startsAt: new Date("2026-12-06T02:30:00Z"),
    venueName: "Estadio Nacional",
    city: "Lima",
  },
  items: [
    { zoneName: "VIP", quantity: 1, unitPriceCents: 45050 },
    { zoneName: "General", quantity: 2, unitPriceCents: 25000 },
  ],
  buyer: { fullName: "Ana Pérez", email: "ana@example.com" },
};

describe("toOrder", () => {
  it("AC12: montos en soles, PEN, pago con tarjeta y sin asientos", () => {
    const order = toOrder(rows);
    expect(order.currency).toBe("PEN");
    expect(order.paymentMethod).toBe("card");
    expect(order.total).toBe(950.5);
    expect(order.items.every((i) => i.seats.length === 0)).toBe(true);
  });

  it("AC12: varios ítems conservan zona y cantidad; el monto es cantidad × precio congelado", () => {
    const order = toOrder(rows);
    expect(order.items).toEqual([
      { zoneName: "VIP", quantity: 1, seats: [], amount: 450.5 },
      { zoneName: "General", quantity: 2, seats: [], amount: 500 },
    ]);
    expect(order.count).toBe(3);
  });

  it("AC12: evento con slug como id y fecha y hora de Lima", () => {
    const { event } = toOrder(rows);
    expect(event).toEqual({
      id: "rock-en-lima",
      title: "Rock en Lima",
      category: "Conciertos",
      image: "https://blob.example/cover.png",
      date: "2026-12-05",
      startTime: "21:30",
      venue: "Estadio Nacional",
      city: "Lima",
    });
  });

  it("AC12: sin portada usa el placeholder; comprador con nombre y correo de la cuenta", () => {
    const order = toOrder({ ...rows, event: { ...rows.event, coverImageUrl: null } });
    expect(order.event.image).toBe(PLACEHOLDER_IMAGE);
    expect(order.code).toBe("TK-K7M2Q");
    expect(order.buyerName).toBe("Ana Pérez");
    expect(order.email).toBe("ana@example.com");
  });
});
