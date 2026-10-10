import { describe, expect, it } from "vitest";
import { buildEventList, type EventListRow } from "./event-list";

const base: EventListRow = {
  id: "e1",
  slug: "e-1",
  title: "Evento 1",
  categoryName: "Música",
  coverImageUrl: null,
  startsAt: new Date("2026-11-15T02:00:00Z"),
  venueName: "Estadio",
  city: "Lima",
  status: "published",
  tierId: null,
  tierName: null,
  tierPriceCents: null,
  tierCapacity: null,
  tierSortOrder: null,
};

const tier = (
  n: number,
  extra: Partial<EventListRow> = {},
  eventId = "e1",
): EventListRow => ({
  ...base,
  id: eventId,
  tierId: `${eventId}-t${n}`,
  tierName: `Zona ${n}`,
  tierPriceCents: n * 10000,
  tierCapacity: 100 * n,
  tierSortOrder: n,
  tierSold: "0",
  tierRevenueCents: "0",
  ...extra,
});

describe("buildEventList (includeSales: true)", () => {
  it("AC7: suma sold, capacity y revenue de los tiers", () => {
    const [e] = buildEventList(
      [
        tier(1, { tierSold: "3", tierRevenueCents: "30000" }),
        tier(2, { tierSold: 2, tierRevenueCents: 40000 }),
      ],
      { includeSales: true },
    );
    expect(e.sales.sold).toBe(5);
    expect(e.sales.capacity).toBe(300);
    expect(e.sales.revenueCents).toBe(70000);
    expect(e.sales.tiers).toHaveLength(2);
  });

  it("AC8: evento sin tipos de entrada queda en 0, tiers vacío y priceFromCents null", () => {
    const [e] = buildEventList([base], { includeSales: true });
    expect(e.sales).toEqual({ sold: 0, capacity: 0, revenueCents: 0, tiers: [] });
    expect(e.priceFromCents).toBeNull();
  });

  it("AC8: evento con tipos y sin ventas (null y '0') da 0", () => {
    const [e] = buildEventList(
      [tier(1, { tierSold: null, tierRevenueCents: null }), tier(2)],
      { includeSales: true },
    );
    expect(e.sales.sold).toBe(0);
    expect(e.sales.revenueCents).toBe(0);
    expect(e.sales.capacity).toBe(300);
  });

  it("AC9: parsea strings de bigint por encima de int4", () => {
    const [e] = buildEventList(
      [tier(1, { tierSold: "12345678901", tierRevenueCents: "98765432109" })],
      { includeSales: true },
    );
    expect(e.sales.sold).toBe(12345678901);
    expect(e.sales.revenueCents).toBe(98765432109);
  });

  it("AC9: un monto fuera de Number.isSafeInteger lanza", () => {
    expect(() =>
      buildEventList([tier(1, { tierRevenueCents: "9007199254740993" })], { includeSales: true }),
    ).toThrow();
    expect(() =>
      buildEventList([tier(1, { tierSold: "abc" })], { includeSales: true }),
    ).toThrow();
  });

  it("AC9: una suma fuera de rango seguro lanza", () => {
    const big = String(Number.MAX_SAFE_INTEGER);
    expect(() =>
      buildEventList(
        [tier(1, { tierRevenueCents: big }), tier(2, { tierRevenueCents: big })],
        { includeSales: true },
      ),
    ).toThrow();
  });

  it("AC8: priceFromCents es el mínimo y los tiers van por sortOrder", () => {
    const [e] = buildEventList(
      [
        tier(3, { tierSortOrder: 3 }),
        tier(1, { tierSortOrder: 1, tierPriceCents: 5000 }),
        tier(2, { tierSortOrder: 2 }),
      ],
      { includeSales: true },
    );
    expect(e.priceFromCents).toBe(5000);
    expect(e.sales.tiers.map((t) => t.id)).toEqual(["e1-t1", "e1-t2", "e1-t3"]);
  });

  it("conserva el orden de primera aparición de los eventos", () => {
    const list = buildEventList(
      [tier(1, {}, "b"), tier(1, {}, "a"), tier(2, {}, "b"), { ...base, id: "c" }],
      { includeSales: true },
    );
    expect(list.map((e) => e.id)).toEqual(["b", "a", "c"]);
    expect(list[0].sales.tiers).toHaveLength(2);
  });

  it("AC4: startsAt en ISO y claves exactas de ManagedEventItem y TierSales", () => {
    const [e] = buildEventList([tier(1)], { includeSales: true });
    expect(e.startsAt).toBe("2026-11-15T02:00:00.000Z");
    expect(Object.keys(e).sort()).toEqual(
      [
        "categoryName", "city", "coverImageUrl", "id", "priceFromCents", "sales",
        "slug", "startsAt", "status", "title", "venueName",
      ].sort(),
    );
    expect(Object.keys(e.sales.tiers[0]).sort()).toEqual(
      ["capacity", "id", "name", "priceCents", "revenueCents", "sold"].sort(),
    );
  });
});

describe("buildEventList (includeSales: false)", () => {
  it("AC5: no emite la clave sales ni datos de ventas, aunque las filas los traigan", () => {
    const [e] = buildEventList(
      [tier(1, { tierSold: "9", tierRevenueCents: "9" }), tier(2)],
      { includeSales: false },
    );
    expect("sales" in e).toBe(false);
    expect(JSON.stringify(e)).not.toMatch(/sales|sold|revenue/i);
    expect(e.priceFromCents).toBe(10000);
  });

  it("AC5: claves exactas de EventListItem, sin organizerId ni clerkUserId", () => {
    const [e] = buildEventList([{ ...base, tierSold: undefined }], { includeSales: false });
    expect(Object.keys(e).sort()).toEqual(
      [
        "categoryName", "city", "coverImageUrl", "id", "priceFromCents",
        "slug", "startsAt", "status", "title", "venueName",
      ].sort(),
    );
    expect(e.priceFromCents).toBeNull();
  });

  it("no parsea montos de ventas (un valor inválido no rompe el alcance público)", () => {
    expect(() =>
      buildEventList([tier(1, { tierSold: "abc" })], { includeSales: false }),
    ).not.toThrow();
  });
});
