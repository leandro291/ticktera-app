import { describe, expect, it } from "vitest";
import { planOrder, type PlanTier } from "./order-plan";

const now = new Date("2026-10-19T12:00:00Z");
const event = { status: "published", startsAt: new Date("2026-12-01T20:00:00Z") };
const tier = (o: Partial<PlanTier> = {}): PlanTier => ({
  id: "t1",
  priceCents: 5000,
  capacity: 10,
  maxPerOrder: 6,
  paid: 0,
  reserved: 0,
  ...o,
});
const plan = (o: { tiers?: PlanTier[]; lines?: { ticketTypeId: string; quantity: number }[]; event?: typeof event } = {}) =>
  planOrder({
    event: o.event ?? event,
    tiers: o.tiers ?? [tier()],
    lines: o.lines ?? [{ ticketTypeId: "t1", quantity: 2 }],
    now,
  });

describe("planOrder", () => {
  it("AC1: devuelve items con el precio de la BD y el total entero", () => {
    const r = plan({
      tiers: [tier(), tier({ id: "t2", priceCents: 12050 })],
      lines: [
        { ticketTypeId: "t1", quantity: 2 },
        { ticketTypeId: "t2", quantity: 1 },
      ],
    });
    expect(r).toEqual({
      ok: true,
      items: [
        { ticketTypeId: "t1", quantity: 2, unitPriceCents: 5000 },
        { ticketTypeId: "t2", quantity: 1, unitPriceCents: 12050 },
      ],
      totalCents: 22050,
    });
  });

  it("AC1: sin líneas → empty", () => {
    expect(plan({ lines: [] })).toEqual({ ok: false, code: "empty" });
  });

  it("AC1: cupo exacto pasa, uno menos → sold-out", () => {
    const lines = [{ ticketTypeId: "t1", quantity: 5 }];
    expect(plan({ lines, tiers: [tier({ capacity: 10, paid: 3, reserved: 2 })] }).ok).toBe(true);
    expect(plan({ lines, tiers: [tier({ capacity: 10, paid: 3, reserved: 3 })] })).toEqual({ ok: false, code: "sold-out" });
  });

  it("AC1: cupo 0 o negativo por datos viejos → sold-out", () => {
    expect(plan({ tiers: [tier({ capacity: 0 })] })).toEqual({ ok: false, code: "sold-out" });
    expect(plan({ tiers: [tier({ capacity: 5, paid: 9 })] })).toEqual({ ok: false, code: "sold-out" });
  });

  it("AC1: cantidad en el tope pasa, tope + 1 → over-limit", () => {
    const big = tier({ capacity: 100, maxPerOrder: 6 });
    expect(plan({ tiers: [big], lines: [{ ticketTypeId: "t1", quantity: 6 }] }).ok).toBe(true);
    expect(plan({ tiers: [big], lines: [{ ticketTypeId: "t1", quantity: 7 }] })).toEqual({ ok: false, code: "over-limit" });
  });

  it("AC1: el tope también vale para líneas repetidas del mismo tipo", () => {
    const big = tier({ capacity: 100, maxPerOrder: 6 });
    const lines = [
      { ticketTypeId: "t1", quantity: 4 },
      { ticketTypeId: "t1", quantity: 3 },
    ];
    expect(plan({ tiers: [big], lines })).toEqual({ ok: false, code: "over-limit" });
  });

  it("AC1: tipo de otro evento → invalid-tier", () => {
    expect(plan({ lines: [{ ticketTypeId: "ajeno", quantity: 1 }] })).toEqual({ ok: false, code: "invalid-tier" });
  });

  it("AC1: total 0 → free-order", () => {
    expect(plan({ tiers: [tier({ priceCents: 0 })] })).toEqual({ ok: false, code: "free-order" });
  });

  it("AC1: total que excede int4 → over-limit; justo en int4 pasa", () => {
    const lines = [{ ticketTypeId: "t1", quantity: 2 }];
    const huge = (priceCents: number) => tier({ priceCents, capacity: 10 });
    expect(plan({ lines, tiers: [huge(1_073_741_824)] })).toEqual({ ok: false, code: "over-limit" });
    expect(plan({ lines: [{ ticketTypeId: "t1", quantity: 1 }], tiers: [huge(2_147_483_647)] }).ok).toBe(true);
  });

  it("AC4: draft, suspended y cancelled no venden", () => {
    for (const status of ["draft", "suspended", "cancelled"]) {
      expect(plan({ event: { ...event, status } })).toEqual({ ok: false, code: "event-unavailable" });
    }
  });

  it("AC4: evento ya empezado o empezando ahora no vende; un instante después sí", () => {
    expect(plan({ event: { status: "published", startsAt: new Date("2026-10-18T20:00:00Z") } })).toEqual({
      ok: false,
      code: "event-unavailable",
    });
    expect(plan({ event: { status: "published", startsAt: now } })).toEqual({ ok: false, code: "event-unavailable" });
    expect(plan({ event: { status: "published", startsAt: new Date(now.getTime() + 1) } }).ok).toBe(true);
  });

  it("AC4: evento no vendible gana sobre un tipo ajeno", () => {
    expect(plan({ event: { ...event, status: "cancelled" }, lines: [{ ticketTypeId: "ajeno", quantity: 1 }] })).toEqual({
      ok: false,
      code: "event-unavailable",
    });
  });
});
