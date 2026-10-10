import { describe, expect, it } from "vitest";
import type { SaveEventInput } from "../types/event-write";
import { deleteEventSchema, moderateEventSchema, saveEventSchema, transitionEventSchema } from "./event-save-schema";

const CATEGORY = "3f1c2a8e-0b7d-4c55-9a43-0e2f6d1b9c10";
const EVENT_ID = "7b2d4e6f-1a3c-4b5d-8e9f-0a1b2c3d4e5f";
const TIER_ID = "c1d2e3f4-a5b6-4c7d-9e8f-102132435465";

const VALID = {
  title: "  Rock   en   el Parque ",
  categoryId: CATEGORY,
  description: "Primera línea\r\n\r\nSegunda   línea ",
  date: "2026-11-14",
  startTime: "21:00",
  venueName: "Estadio Nacional",
  address: "",
  city: "Lima",
  tiers: [{ name: "General", priceCents: 5000, capacity: 100, maxPerOrder: 4 }],
};

const parse = (over: Record<string, unknown> = {}) => saveEventSchema.safeParse({ ...VALID, ...over });
const firstPath = (over: Record<string, unknown>) => {
  const r = parse(over);
  return r.success ? null : r.error.issues[0].path.join(".");
};

describe("saveEventSchema", () => {
  it("AC10: ejemplo válido normaliza textos y aplica defaults", () => {
    const r = parse();
    expect(r.success).toBe(true);
    if (!r.success) return;
    const data: SaveEventInput = r.data;
    expect(data.title).toBe("Rock en el Parque");
    expect(data.description).toBe("Primera línea\n\nSegunda línea");
    expect(data.publish).toBe(false);
    expect(data.acknowledgeBuyerImpact).toBe(false);
  });

  it("AC10: maxPerOrder por defecto 6", () => {
    const r = parse({ tiers: [{ name: "General", priceCents: 0, capacity: 10 }] });
    expect(r.success && r.data.tiers[0].maxPerOrder).toBe(6);
  });

  it("AC3: descarta organizerId, status, slug, coverImageUrl y publishedAt", () => {
    const r = parse({ organizerId: EVENT_ID, status: "published", slug: "x", coverImageUrl: "https://evil", publishedAt: "2026-01-01" });
    expect(r.success).toBe(true);
    if (!r.success) return;
    for (const key of ["organizerId", "status", "slug", "coverImageUrl", "publishedAt"]) expect(r.data).not.toHaveProperty(key);
  });

  it("AC10/D11: un borrador exige título, categoría, fecha, hora, lugar y ciudad", () => {
    expect(firstPath({ title: "   " })).toBe("title");
    expect(firstPath({ categoryId: "" })).toBe("categoryId");
    expect(firstPath({ date: "" })).toBe("date");
    expect(firstPath({ startTime: "" })).toBe("startTime");
    expect(firstPath({ venueName: "" })).toBe("venueName");
    expect(firstPath({ city: "" })).toBe("city");
    expect(parse({ tiers: [], description: "", address: "" }).success).toBe(true);
  });

  it("AC10: límites de largo", () => {
    expect(firstPath({ title: "a".repeat(121) })).toBe("title");
    expect(parse({ title: "a".repeat(120) }).success).toBe(true);
    expect(firstPath({ description: "a".repeat(5001) })).toBe("description");
    expect(firstPath({ venueName: "a".repeat(121) })).toBe("venueName");
    expect(firstPath({ address: "a".repeat(201) })).toBe("address");
    expect(firstPath({ city: "a".repeat(81) })).toBe("city");
    expect(firstPath({ tiers: [{ name: "a".repeat(61), priceCents: 0, capacity: 1 }] })).toBe("tiers.0.name");
  });

  it("AC10: precio, capacidad, maxPerOrder y cantidad de tipos", () => {
    const tier = (over: Record<string, unknown>) => ({ tiers: [{ name: "G", priceCents: 0, capacity: 1, ...over }] });
    expect(firstPath(tier({ priceCents: 1_000_001 }))).toBe("tiers.0.priceCents");
    expect(firstPath(tier({ priceCents: 10.5 }))).toBe("tiers.0.priceCents");
    expect(firstPath(tier({ priceCents: -1 }))).toBe("tiers.0.priceCents");
    expect(firstPath(tier({ priceCents: Number.NaN }))).toBe("tiers.0.priceCents");
    expect(firstPath(tier({ capacity: 100_001 }))).toBe("tiers.0.capacity");
    expect(firstPath(tier({ maxPerOrder: 0 }))).toBe("tiers.0.maxPerOrder");
    expect(firstPath(tier({ maxPerOrder: 21 }))).toBe("tiers.0.maxPerOrder");
    const eleven = Array.from({ length: 11 }, (_, i) => ({ name: `T${i}`, priceCents: 0, capacity: 1 }));
    expect(firstPath({ tiers: eleven })).toBe("tiers");
  });

  it("AC10: rechaza HTML pero permite '<' suelto", () => {
    expect(firstPath({ title: "<script>alert(1)</script>" })).toBe("title");
    expect(firstPath({ description: "hola <b>mundo</b>" })).toBe("description");
    expect(firstPath({ tiers: [{ name: "<img src=x onerror=1>", priceCents: 0, capacity: 1 }] })).toBe("tiers.0.name");
    expect(parse({ title: "a < b", description: "3 < 5 y 5 > 3" }).success).toBe(true);
  });

  it("AC10: rechaza caracteres de control y bidi", () => {
    expect(firstPath({ title: "a\u0000b" })).toBe("title");
    expect(firstPath({ description: "a\u0007b" })).toBe("description");
    expect(firstPath({ city: "Lima‮" })).toBe("city");
    expect(firstPath({ venueName: "⁦x" })).toBe("venueName");
  });

  it("AC10: nombres de tipo únicos sin distinguir mayúsculas", () => {
    const tiers = [
      { name: "General", priceCents: 0, capacity: 1 },
      { name: "GENERAL", priceCents: 0, capacity: 1 },
    ];
    expect(firstPath({ tiers })).toBe("tiers.1.name");
  });

  it("AC10: id sin expectedUpdatedAt", () => {
    expect(firstPath({ id: EVENT_ID })).toBe("expectedUpdatedAt");
    expect(parse({ id: EVENT_ID, expectedUpdatedAt: "2026-10-09T20:00:00.123Z" }).success).toBe(true);
  });

  it("AC10/AC11: fecha y hora con formato inválido o fecha imposible", () => {
    expect(firstPath({ date: "14/11/2026" })).toBe("date");
    expect(firstPath({ startTime: "9:00" })).toBe("startTime");
    expect(firstPath({ startTime: "24:00" })).toBe("startTime");
    expect(firstPath({ date: "2026-02-30" })).toBe("date");
  });

  it("AC10: tipos con id deben ser uuid", () => {
    expect(parse({ tiers: [{ id: TIER_ID, name: "G", priceCents: 0, capacity: 1 }] }).success).toBe(true);
    expect(firstPath({ tiers: [{ id: "1", name: "G", priceCents: 0, capacity: 1 }] })).toBe("tiers.0.id");
  });
});

describe("schemas de transición, moderación y borrado", () => {
  it("AC10: acción válida e id uuid", () => {
    expect(transitionEventSchema.safeParse({ id: EVENT_ID, action: "publish" }).success).toBe(true);
    expect(moderateEventSchema.safeParse({ id: EVENT_ID, action: "suspend" }).success).toBe(true);
    expect(deleteEventSchema.safeParse({ id: EVENT_ID }).success).toBe(true);
  });

  it("AC10: rechaza acción inválida, id no uuid y suspend en transition", () => {
    expect(transitionEventSchema.safeParse({ id: EVENT_ID, action: "suspend" }).success).toBe(false);
    expect(moderateEventSchema.safeParse({ id: EVENT_ID, action: "publish" }).success).toBe(false);
    expect(transitionEventSchema.safeParse({ id: "x", action: "publish" }).success).toBe(false);
    expect(deleteEventSchema.safeParse({ id: "1" }).success).toBe(false);
  });
});
