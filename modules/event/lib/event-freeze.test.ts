import { describe, expect, it } from "vitest";
import type { TierInput } from "../types/event-write";
import { checkFrozenEdit, committed, FREEZE_MESSAGES, type CurrentTier, type EventPlace, type FreezeIssueCode } from "./event-freeze";

const PLACE: EventPlace = { startsAt: new Date("2026-11-15T02:00:00.000Z"), venueName: "Estadio", address: "Av. 1", city: "Lima" };

const tier = (over: Partial<CurrentTier> = {}): CurrentTier => ({
  id: "t1",
  name: "General",
  priceCents: 5000,
  capacity: 100,
  maxPerOrder: 6,
  paid: 0,
  reserved: 0,
  orderItems: 0,
  ...over,
});
const input = (t: CurrentTier, over: Partial<TierInput> = {}): TierInput => ({
  id: t.id,
  name: t.name,
  priceCents: t.priceCents,
  capacity: t.capacity,
  maxPerOrder: t.maxPerOrder,
  ...over,
});
const check = (tiers: CurrentTier[], next: TierInput[], place: EventPlace = PLACE, ack = false) =>
  checkFrozenEdit({ place: PLACE, tiers }, { place, tiers: next }, ack);
const codes = (issues: { code: FreezeIssueCode }[]) => issues.map((i) => i.code);

describe("committed", () => {
  it("AC15: paid + reserved", () => {
    expect(committed({ paid: 3, reserved: 2 })).toBe(5);
  });
});

describe("checkFrozenEdit sin ventas", () => {
  it("AC15: precio, nombre, capacidad y quitar son libres", () => {
    const t = tier();
    expect(check([t], [input(t, { priceCents: 1, name: "VIP", capacity: 0 })])).toEqual([]);
    expect(check([t], [])).toEqual([]);
  });

  it("AC16: sin ventas no pide confirmación al cambiar fecha o lugar", () => {
    const t = tier();
    expect(check([t], [input(t)], { ...PLACE, city: "Cusco", startsAt: new Date("2027-01-01") })).toEqual([]);
  });

  it("AC15: un tipo solo con order_items (vencidas/reembolsadas) no se quita, pero su precio es libre", () => {
    const t = tier({ orderItems: 2 });
    expect(check([t], [])).toEqual([{ code: "tier-remove-has-orders", tierId: "t1" }]);
    expect(check([t], [input(t, { priceCents: 9900 })])).toEqual([]);
  });
});

describe("checkFrozenEdit con ventas", () => {
  for (const [label, sales] of [
    ["paid", { paid: 10, orderItems: 1 }],
    ["reserved", { reserved: 10, orderItems: 1 }],
  ] as const) {
    it(`AC15: con ${label}, precio y nombre fijos`, () => {
      const t = tier(sales);
      expect(codes(check([t], [input(t, { priceCents: 6000 })]))).toEqual(["tier-price-locked"]);
      expect(codes(check([t], [input(t, { name: "VIP" })]))).toEqual(["tier-name-locked"]);
    });

    it(`AC15: con ${label}, capacidad mínima = comprometido`, () => {
      const t = tier(sales);
      expect(check([t], [input(t, { capacity: 10 })])).toEqual([]);
      expect(check([t], [input(t, { capacity: 9 })])).toEqual([{ code: "tier-capacity-below-committed", tierId: "t1", min: 10 }]);
    });

    it(`AC15: con ${label}, no se puede quitar`, () => {
      expect(check([tier(sales)], [])).toEqual([{ code: "tier-remove-locked", tierId: "t1" }]);
    });
  }

  it("AC15: datos viejos con capacidad bajo lo vendido no bloquean mientras no se baje más", () => {
    const t = tier({ capacity: 8, paid: 10, orderItems: 1 });
    expect(check([t], [input(t)])).toEqual([]);
    expect(check([t], [input(t, { capacity: 9 })])).toEqual([]);
    expect(check([t], [input(t, { capacity: 7 })])).toEqual([{ code: "tier-capacity-below-committed", tierId: "t1", min: 8 }]);
  });

  it("AC15: maxPerOrder y agregar tipos nuevos siempre se permiten", () => {
    const t = tier({ paid: 5, orderItems: 1 });
    expect(check([t], [input(t, { maxPerOrder: 2 }), { name: "VIP", priceCents: 9000, capacity: 50, maxPerOrder: 4 }])).toEqual([]);
  });

  it("AC15: ventas parciales: el tipo sin ventas se edita y se quita libre", () => {
    const sold = tier({ id: "a", paid: 3, orderItems: 1 });
    const free = tier({ id: "b", name: "VIP" });
    expect(check([sold, free], [input(sold)])).toEqual([]);
    expect(check([sold, free], [input(sold), input(free, { priceCents: 1 })])).toEqual([]);
  });

  it("AC16: cambiar fecha, lugar, dirección o ciudad con ventas exige confirmación", () => {
    const t = tier({ paid: 1, orderItems: 1 });
    const changes: Partial<EventPlace>[] = [
      { startsAt: new Date("2026-11-16T02:00:00.000Z") },
      { venueName: "Otro" },
      { address: "Av. 2" },
      { city: "Cusco" },
    ];
    for (const change of changes) {
      expect(codes(check([t], [input(t)], { ...PLACE, ...change }))).toEqual(["buyer-impact-unacknowledged"]);
      expect(check([t], [input(t)], { ...PLACE, ...change }, true)).toEqual([]);
    }
  });
});

describe("checkFrozenEdit ids", () => {
  it("AC5: id de otro evento o inventado → tier-not-found", () => {
    expect(check([tier()], [input(tier()), { id: "ajeno", name: "X", priceCents: 0, capacity: 1, maxPerOrder: 1 }])).toEqual([
      { code: "tier-not-found", tierId: "ajeno" },
    ]);
  });

  it("AC5: id repetido → duplicate-tier-id", () => {
    const t = tier();
    expect(check([t], [input(t), input(t, { name: "Otro" })])).toEqual([{ code: "duplicate-tier-id", tierId: "t1" }]);
  });
});

describe("FREEZE_MESSAGES", () => {
  it("AC15: cubre todos los códigos; capacidad muestra el mínimo", () => {
    const all: FreezeIssueCode[] = [
      "tier-not-found",
      "duplicate-tier-id",
      "tier-price-locked",
      "tier-name-locked",
      "tier-capacity-below-committed",
      "tier-remove-locked",
      "tier-remove-has-orders",
      "buyer-impact-unacknowledged",
    ];
    for (const code of all) expect(FREEZE_MESSAGES[code]({ code })).toBeTruthy();
    expect(FREEZE_MESSAGES["tier-capacity-below-committed"]({ code: "tier-capacity-below-committed", min: 12 })).toContain("12");
  });
});
