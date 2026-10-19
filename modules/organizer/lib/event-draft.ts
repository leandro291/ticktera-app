import { EVENT_LIMITS, type EventEditData, type SaveEventInput } from "@/modules/event";
import type { EventDraft, TierDraft } from "../types/event-form";

let tierSeq = 0;

export function createTierDraft(): TierDraft {
  tierSeq += 1;
  return { id: `tier-${tierSeq}`, name: "", price: "", quantity: "", maxPerOrder: EVENT_LIMITS.defaultMaxPerOrder, committed: 0, hasOrders: false };
}

export function createEventDraft(defaultCategoryId: string): EventDraft {
  return {
    title: "",
    categoryId: defaultCategoryId,
    description: "",
    date: "",
    startTime: "",
    venueName: "",
    address: "",
    city: "",
    tiers: [createTierDraft(), createTierDraft()],
  };
}

/** "12.5" → 1250. Sin flotantes acumulados: se valida el texto antes de convertir. "" o inválido → NaN (Zod lo rechaza). */
export function solesToCents(price: string): number {
  const text = price.trim();
  return /^\d+(\.\d{1,2})?$/.test(text) ? Math.round(Number(text) * 100) : Number.NaN;
}

/** Cantidad entera; "" o inválido → NaN. */
const toQuantity = (quantity: string) => (/^\d+$/.test(quantity.trim()) ? Number(quantity) : Number.NaN);

/** Fila nueva sin nada escrito: no viaja al servidor. */
export const isEmptyTierRow = (t: TierDraft) => !t.serverId && !t.name.trim() && !t.price.trim() && !t.quantity.trim();

/** Payload de saveEventAction; descarta filas de tipo totalmente vacías y usa la posición como sort_order. */
export function buildSaveInput(
  draft: EventDraft,
  opts: { id?: string; expectedUpdatedAt?: string; publish: boolean; acknowledgeBuyerImpact: boolean },
): SaveEventInput {
  return {
    ...opts,
    title: draft.title,
    categoryId: draft.categoryId,
    description: draft.description,
    date: draft.date,
    startTime: draft.startTime,
    venueName: draft.venueName,
    address: draft.address,
    city: draft.city,
    tiers: draft.tiers.filter((t) => !isEmptyTierRow(t)).map((t) => ({
      ...(t.serverId && { id: t.serverId }),
      name: t.name,
      priceCents: solesToCents(t.price),
      capacity: toQuantity(t.quantity),
      maxPerOrder: t.maxPerOrder,
    })),
  };
}

/** Datos del servidor → estado del formulario (céntimos → soles). */
export function draftFromEditData(data: EventEditData): EventDraft {
  return {
    title: data.title,
    categoryId: data.categoryId,
    description: data.description,
    date: data.date,
    startTime: data.startTime,
    venueName: data.venueName,
    address: data.address,
    city: data.city,
    tiers: data.tiers.map((t) => ({
      ...createTierDraft(),
      serverId: t.id,
      name: t.name,
      price: String(t.priceCents / 100),
      quantity: String(t.capacity),
      maxPerOrder: t.maxPerOrder,
      committed: t.sold + t.reserved,
      hasOrders: t.hasOrders,
    })),
  };
}

/** Parses a price/quantity input for the live totals; anything invalid or negative counts as 0. */
function parseAmount(value: string): number {
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
