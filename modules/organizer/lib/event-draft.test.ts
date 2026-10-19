import { describe, expect, it } from "vitest";
import type { EventEditData } from "@/modules/event";
import type { TierDraft } from "../types/event-form";
import { buildSaveInput, createEventDraft, createTierDraft, draftFromEditData, getMinPrice, getTotalCapacity, solesToCents } from "./event-draft";

const tier = (over: Partial<TierDraft>): TierDraft => ({ ...createTierDraft(), name: "General", price: "10", quantity: "5", ...over });

const EDIT: EventEditData = {
  id: "7b2d4e6f-1a3c-4b5d-8e9f-0a1b2c3d4e5f",
  status: "published",
  updatedAt: "2026-10-09T20:00:00.123Z",
  title: "Festival",
  categoryId: "3f1c2a8e-0b7d-4c55-9a43-0e2f6d1b9c10",
  description: "Uno\nDos",
  coverImageUrl: null,
  date: "2026-11-14",
  startTime: "21:00",
  venueName: "Estadio",
  address: "Av. 1",
  city: "Lima",
  hasSales: true,
  tiers: [
    { id: "c1d2e3f4-a5b6-4c7d-9e8f-102132435465", name: "General", priceCents: 1250, capacity: 100, maxPerOrder: 4, sold: 3, reserved: 2, hasOrders: true },
    { id: "d1d2e3f4-a5b6-4c7d-9e8f-102132435465", name: "VIP", priceCents: 30000, capacity: 20, maxPerOrder: 6, sold: 0, reserved: 0, hasOrders: false },
  ],
};

describe("solesToCents", () => {
  it("AC24: convierte soles a céntimos sin flotantes", () => {
    expect(solesToCents("12.5")).toBe(1250);
    expect(solesToCents("0.1")).toBe(10);
    expect(solesToCents("19.99")).toBe(1999);
    expect(solesToCents(" 40 ")).toBe(4000);
  });

  it("AC24: inválido → NaN", () => {
    expect(solesToCents("1.005")).toBeNaN();
    expect(solesToCents("")).toBeNaN();
    expect(solesToCents("-1")).toBeNaN();
    expect(solesToCents("1e3")).toBeNaN();
  });
});

describe("createEventDraft", () => {
  it("AC24: usa la categoría por defecto y arranca con dos tipos vacíos con ids distintos", () => {
    const draft = createEventDraft("cat-1");
    expect(draft.categoryId).toBe("cat-1");
    expect(draft.tiers).toHaveLength(2);
    expect(draft.tiers[0].id).not.toBe(draft.tiers[1].id);
  });
});

describe("buildSaveInput", () => {
  it("AC24: descarta filas totalmente vacías, usa la posición y conserva serverId y maxPerOrder", () => {
    const draft = {
      ...createEventDraft("cat"),
      tiers: [tier({ name: "", price: "", quantity: "" }), tier({ serverId: "srv-1", maxPerOrder: 3 }), tier({ name: "VIP", price: "12.5", quantity: "7" })],
    };
    const input = buildSaveInput(draft, { id: "evt", expectedUpdatedAt: "x", publish: true, acknowledgeBuyerImpact: false });
    expect(input.tiers).toEqual([
      { id: "srv-1", name: "General", priceCents: 1000, capacity: 5, maxPerOrder: 3 },
      { name: "VIP", priceCents: 1250, capacity: 7, maxPerOrder: 6 },
    ]);
    expect(input).toMatchObject({ id: "evt", expectedUpdatedAt: "x", publish: true, acknowledgeBuyerImpact: false });
  });

  it("AC24: una fila existente vacía no se descarta; cantidad inválida → NaN", () => {
    const input = buildSaveInput({ ...createEventDraft("c"), tiers: [tier({ serverId: "s", name: "", price: "", quantity: "1.5" })] }, { publish: false, acknowledgeBuyerImpact: false });
    expect(input.tiers).toHaveLength(1);
    expect(input.tiers[0].capacity).toBeNaN();
  });
});

describe("draftFromEditData", () => {
  it("AC24: céntimos → soles, comprometido y órdenes", () => {
    const draft = draftFromEditData(EDIT);
    expect(draft).toMatchObject({ title: "Festival", description: "Uno\nDos", address: "Av. 1", date: "2026-11-14", startTime: "21:00" });
    expect(draft.tiers[0]).toMatchObject({ serverId: EDIT.tiers[0].id, price: "12.5", quantity: "100", maxPerOrder: 4, committed: 5, hasOrders: true });
    expect(draft.tiers[1]).toMatchObject({ price: "300", committed: 0, hasOrders: false });
  });

  it("AC24: ida y vuelta conserva precios y capacidades", () => {
    const input = buildSaveInput(draftFromEditData(EDIT), { publish: false, acknowledgeBuyerImpact: false });
    expect(input.tiers.map((t) => [t.id, t.priceCents, t.capacity])).toEqual(EDIT.tiers.map((t) => [t.id, t.priceCents, t.capacity]));
  });
});

describe("totals", () => {
  it("AC24: capacidad total y precio mínimo sobre TierDraft", () => {
    const tiers = [tier({ price: "50", quantity: "100" }), tier({ price: "", quantity: "abc" }), tier({ price: "30", quantity: "2.7" })];
    expect(getTotalCapacity(tiers)).toBe(102);
    expect(getMinPrice(tiers)).toBe(30);
    expect(getMinPrice([tier({ price: "" })])).toBeNull();
  });
});
