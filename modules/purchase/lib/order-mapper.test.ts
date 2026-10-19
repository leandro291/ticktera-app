import { describe, expect, it } from "vitest";
import { PLACEHOLDER_IMAGE } from "@/modules/event";
import { groupOrderRows, toOrder, type FlatOrderRow, type OrderRows } from "./order-mapper";

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
  tickets: [],
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

describe("toOrder tickets", () => {
  it("AC4: mapea cada ticket a { code, zoneName, holderName, status }", () => {
    const order = toOrder({
      ...rows,
      tickets: [
        { code: "AAAAAAAAAAAA", zoneName: "VIP", holderName: "Ana Pérez", status: "valid" },
        { code: "BBBBBBBBBBBB", zoneName: "General", holderName: "Ana Pérez", status: "used" },
      ],
    });
    expect(order.tickets).toEqual([
      { code: "AAAAAAAAAAAA", zoneName: "VIP", holderName: "Ana Pérez", status: "valid" },
      { code: "BBBBBBBBBBBB", zoneName: "General", holderName: "Ana Pérez", status: "used" },
    ]);
  });

  it("AC4: sin tickets deja tickets: []", () => {
    expect(toOrder(rows).tickets).toEqual([]);
  });
});

const base = {
  status: "paid" as const,
  totalCents: 95050,
  slug: "rock-en-lima",
  title: "Rock en Lima",
  categoryName: "Conciertos",
  coverImageUrl: null,
  startsAt: new Date("2026-12-06T02:30:00Z"),
  venueName: "Estadio Nacional",
  city: "Lima",
  fullName: "Ana Pérez",
  email: "ana@example.com",
};
const flat = (
  code: string,
  itemId: string,
  zoneName: string,
  quantity: number,
  ticketCode: string | null,
  extra: Partial<FlatOrderRow> = {},
): FlatOrderRow => ({
  ...base,
  code,
  itemId,
  zoneName,
  quantity,
  unitPriceCents: 10000,
  ticketCode,
  ticketStatus: ticketCode ? "valid" : null,
  holderName: ticketCode ? "Ana Pérez" : null,
  ...extra,
});

describe("groupOrderRows", () => {
  it("AC2: ítem con 1 y con 3 tickets: se deduplica el ítem y quedan todos los tickets", () => {
    const [{ order }] = groupOrderRows([
      flat("TK-1", "i1", "VIP", 1, "AAAAAAAAAAA1"),
      flat("TK-1", "i2", "General", 3, "BBBBBBBBBBB1"),
      flat("TK-1", "i2", "General", 3, "BBBBBBBBBBB2"),
      flat("TK-1", "i2", "General", 3, "BBBBBBBBBBB3"),
    ]);
    expect(order.items.map((i) => [i.zoneName, i.quantity])).toEqual([["VIP", 1], ["General", 3]]);
    expect(order.count).toBe(4);
    expect(order.tickets.map((t) => t.code)).toEqual(["AAAAAAAAAAA1", "BBBBBBBBBBB1", "BBBBBBBBBBB2", "BBBBBBBBBBB3"]);
  });

  it("AC2: dos órdenes conservan el orden de aparición y su estado", () => {
    const result = groupOrderRows([
      flat("TK-2", "i3", "VIP", 1, "CCCCCCCCCCC1"),
      flat("TK-1", "i1", "VIP", 1, "AAAAAAAAAAA1", { status: "refunded" }),
    ]);
    expect(result.map((r) => [r.order.code, r.status])).toEqual([["TK-2", "paid"], ["TK-1", "refunded"]]);
    expect(result[0].order.tickets.map((t) => t.code)).toEqual(["CCCCCCCCCCC1"]);
    expect(result[1].order.tickets.map((t) => t.code)).toEqual(["AAAAAAAAAAA1"]);
  });

  it("AC2: orden sin tickets (ítem con columnas null) da tickets: []", () => {
    const [{ order }] = groupOrderRows([flat("TK-3", "i4", "VIP", 2, null, { status: "pending" })]);
    expect(order.tickets).toEqual([]);
    expect(order.items).toHaveLength(1);
  });

  it("AC2: cada ticket toma la zona de su ítem aunque los ítems vengan intercalados", () => {
    const [{ order }] = groupOrderRows([
      flat("TK-4", "i1", "VIP", 2, "AAAAAAAAAAA1"),
      flat("TK-4", "i2", "General", 1, "BBBBBBBBBBB1"),
      flat("TK-4", "i1", "VIP", 2, "AAAAAAAAAAA2"),
    ]);
    expect(order.items.map((i) => i.zoneName)).toEqual(["VIP", "General"]);
    expect(order.tickets.map((t) => [t.code, t.zoneName])).toEqual([
      ["AAAAAAAAAAA1", "VIP"],
      ["BBBBBBBBBBB1", "General"],
      ["AAAAAAAAAAA2", "VIP"],
    ]);
  });

  it("AC2: sin filas devuelve []", () => {
    expect(groupOrderRows([])).toEqual([]);
  });
});
