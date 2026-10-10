import { describe, expect, it } from "vitest";
import { GENERAL_ADMISSION_CAPACITY, buildSeedRows, ensureFuture, slugify } from "./mock-to-rows";

const ORGANIZER = "00000000-0000-0000-0000-000000000001";

describe("buildSeedRows", () => {
  it("AC15: 8 categories with index sort_order and accent-free slugs", async () => {
    const { categories } = await buildSeedRows(ORGANIZER);
    expect(categories).toHaveLength(8);
    expect(categories.map((c) => c.sortOrder)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(categories.map((c) => c.slug)).toContain("arte-y-exposiciones");
    expect(categories.every((c) => /^[a-z0-9-]+$/.test(c.slug))).toBe(true);
    expect(slugify("Ciudad de México")).toBe("ciudad-de-mexico");
  });

  it("AC15: 8 published PEN events with unique slugs; evt-006 and evt-007 skipped with reason", async () => {
    const { events, skipped } = await buildSeedRows(ORGANIZER);
    expect(events).toHaveLength(8);
    expect(events.every((e) => e.status === "published" && e.organizerId === ORGANIZER)).toBe(true);
    expect(new Set(events.map((e) => e.slug)).size).toBe(8);
    expect(skipped.map((s) => s.id).sort()).toEqual(["evt-006", "evt-007"]);
    expect(skipped.find((s) => s.id === "evt-006")?.reason).toContain("EUR");
    expect(skipped.find((s) => s.id === "evt-007")?.reason).toContain("USD");
  });

  it("AC15: starts_at is the Lima local time (-05:00)", async () => {
    const { events } = await buildSeedRows(ORGANIZER);
    const bad = events.find((e) => e.slug === "bad-bunny-world-tour");
    expect(bad?.startsAt).toEqual(new Date("2026-11-14T21:00:00-05:00"));
  });

  it("AC15: Bad Bunny has 5 stadium zones priced in cents; Romeo y Julieta has 4 theater zones", async () => {
    const { ticketTypes } = await buildSeedRows(ORGANIZER);
    const bad = ticketTypes.filter((t) => t.eventSlug === "bad-bunny-world-tour");
    expect(bad.map((t) => t.priceCents)).toEqual([690, 450, 380, 320, 250].map((p) => p * 100));
    expect(bad.map((t) => t.sortOrder)).toEqual([0, 1, 2, 3, 4]);
    expect(bad.every((t) => t.maxPerOrder === 6)).toBe(true);
    expect(ticketTypes.filter((t) => t.eventSlug === "romeo-y-julieta-obra-de-teatro")).toHaveLength(4);
  });

  it("AC15: no zone starts sold out (capacity > 0); general = 1000; numbered = seat count", async () => {
    const { ticketTypes } = await buildSeedRows(ORGANIZER);
    expect(ticketTypes.every((t) => t.capacity > 0)).toBe(true);

    const bad = ticketTypes.filter((t) => t.eventSlug === "bad-bunny-world-tour");
    expect(bad[0].capacity).toBeGreaterThan(0); // Campo VIP (mock sold-out) keeps its real capacity
    expect(bad[1].capacity).toBe(GENERAL_ADMISSION_CAPACITY); // Campo General
    expect(bad[2].capacity).toBeGreaterThan(80); // Occidente (numbered)
    expect(bad[2].capacity).not.toBe(GENERAL_ADMISSION_CAPACITY);
  });

  it("AC15: unique (event, name) ticket types and deterministic output", async () => {
    const a = await buildSeedRows(ORGANIZER);
    const keys = a.ticketTypes.map((t) => `${t.eventSlug}/${t.name}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(await buildSeedRows(ORGANIZER)).toEqual(a);
  });

  it("reparte los eventos entre varios organizadores usando solo los dados", async () => {
    let i = 0;
    const { events } = await buildSeedRows(["org-a", "org-b"], (items) => items[i++ % items.length]);
    expect(new Set(events.map((e) => e.organizerId))).toEqual(new Set(["org-a", "org-b"]));
  });

  it("every event starts after today: past or same-day mock dates move forward whole years", async () => {
    const now = new Date("2026-10-05T12:00:00-05:00");
    const { events } = await buildSeedRows(ORGANIZER, undefined, now);
    const endOfToday = new Date("2026-10-05T23:59:59.999-05:00");
    expect(events.every((e) => e.startsAt > endOfToday)).toBe(true);
    const vive = events.find((e) => e.slug === "festival-vive-latino-lima");
    expect(vive?.startsAt.getUTCFullYear()).toBe(2027); // mock date 2026-10-05 is today, not after it
    const bad = events.find((e) => e.slug === "bad-bunny-world-tour");
    expect(bad?.startsAt).toEqual(new Date("2026-11-14T21:00:00-05:00")); // future dates stay as they are
  });

  it("ensureFuture keeps future dates and moves past ones by whole years", () => {
    const now = new Date("2026-10-05T00:00:00Z");
    expect(ensureFuture(new Date("2026-11-01T00:00:00Z"), now)).toEqual(new Date("2026-11-01T00:00:00Z"));
    expect(ensureFuture(new Date("2026-10-05T00:00:00Z"), now)).toEqual(new Date("2027-10-05T00:00:00Z"));
    // later the same Lima day is still "today": it moves too
    expect(ensureFuture(new Date("2026-10-04T22:00:00-05:00"), now)).toEqual(new Date("2027-10-04T22:00:00-05:00"));
    // the next Lima day is fine
    expect(ensureFuture(new Date("2026-10-05T00:00:00-05:00"), now)).toEqual(new Date("2026-10-05T00:00:00-05:00"));
    expect(ensureFuture(new Date("2024-03-01T00:00:00Z"), now)).toEqual(new Date("2027-03-01T00:00:00Z"));
  });
});
