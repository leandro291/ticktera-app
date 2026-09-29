import type { EventDraft, OrganizerEvent, OrganizerEventStatus, TierDraft } from "../types/organizer-event";

let tierSeq = 0;

export function createTierDraft(): TierDraft {
  tierSeq += 1;
  return { id: `tier-${tierSeq}`, name: "", price: "", quantity: "" };
}

export function createEventDraft(): EventDraft {
  return {
    title: "",
    category: "Conciertos",
    description: "",
    date: "",
    startTime: "",
    venue: "",
    city: "",
    tiers: [createTierDraft(), createTierDraft()],
  };
}

/** Parses a price/quantity input; anything invalid or negative counts as 0. */
export function parseAmount(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function getTotalCapacity(tiers: TierDraft[]): number {
  return tiers.reduce((sum, t) => sum + Math.floor(parseAmount(t.quantity)), 0);
}

/** Lowest price above 0 ("Desde" in the preview), or null while no tier has a price. */
export function getMinPrice(tiers: TierDraft[]): number | null {
  const prices = tiers.map((t) => parseAmount(t.price)).filter((p) => p > 0);
  return prices.length ? Math.min(...prices) : null;
}

export function buildOrganizerEvent(draft: EventDraft, status: OrganizerEventStatus, id: string, previous?: OrganizerEvent): OrganizerEvent {
  return {
    id,
    catalogId: previous?.catalogId,
    title: draft.title.trim(),
    category: draft.category,
    description: draft.description.trim(),
    image: draft.image,
    date: draft.date,
    startTime: draft.startTime,
    venue: draft.venue.trim(),
    city: draft.city.trim(),
    status,
    tiers: draft.tiers.map((t) => ({
      id: t.id,
      name: t.name.trim(),
      price: parseAmount(t.price),
      capacity: Math.floor(parseAmount(t.quantity)),
      sold: previous?.tiers.find((p) => p.id === t.id)?.sold ?? 0,
    })),
  };
}

/** Form state to keep editing a saved event. */
export function draftFromEvent(event: OrganizerEvent): EventDraft {
  return {
    title: event.title,
    category: event.category,
    description: event.description,
    image: event.image,
    date: event.date,
    startTime: event.startTime,
    venue: event.venue,
    city: event.city,
    tiers: event.tiers.map((t) => ({ id: t.id, name: t.name, price: String(t.price || ""), quantity: String(t.capacity || "") })),
  };
}
