import { describe, expect, it } from "vitest";
import { ORGANIZER_EVENTS } from "../data/organizer-events";
import type { TierDraft } from "../types/organizer-event";
import { buildOrganizerEvent, createEventDraft, draftFromEvent, getMinPrice, getTotalCapacity, parseAmount } from "./event-draft";

const tier = (price: string, quantity: string): TierDraft => ({ id: `t-${price}-${quantity}`, name: "General", price, quantity });

describe("createEventDraft", () => {
  it("AC13: starts with two empty ticket tiers with distinct ids", () => {
    const { tiers } = createEventDraft();
    expect(tiers).toHaveLength(2);
    expect(tiers[0].id).not.toBe(tiers[1].id);
  });
});

describe("parseAmount", () => {
  it("treats empty, invalid and negative input as 0", () => {
    expect(parseAmount("")).toBe(0);
    expect(parseAmount("abc")).toBe(0);
    expect(parseAmount("-5")).toBe(0);
    expect(parseAmount("12.5")).toBe(12.5);
  });
});

describe("getTotalCapacity", () => {
  it("AC13: adds whole quantities of every tier", () => {
    expect(getTotalCapacity([tier("50", "100"), tier("", "250"), tier("10", "")])).toBe(350);
  });
});

describe("getMinPrice", () => {
  it("AC13: returns the lowest positive price, or null when none is set", () => {
    expect(getMinPrice([tier("80", "1"), tier("45", "1"), tier("0", "1")])).toBe(45);
    expect(getMinPrice([tier("", "1")])).toBeNull();
  });
});

describe("buildOrganizerEvent / draftFromEvent", () => {
  it("AC13: round-trips a saved event and keeps sold counts and catalog id", () => {
    const saved = ORGANIZER_EVENTS[0];
    const rebuilt = buildOrganizerEvent(draftFromEvent(saved), "published", saved.id, saved);
    expect(rebuilt).toEqual(saved);
  });

  it("AC13: trims text and starts new tiers with 0 sold", () => {
    const draft = { ...createEventDraft(), title: "  Nuevo  ", tiers: [tier("30", "200")] };
    const event = buildOrganizerEvent(draft, "draft", "org-new");
    expect(event.title).toBe("Nuevo");
    expect(event.tiers).toEqual([{ id: draft.tiers[0].id, name: "General", price: 30, capacity: 200, sold: 0 }]);
  });
});
