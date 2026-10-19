import { tierAvailable } from "@/modules/event";

export const ORDER_HOLD_SECONDS = 15 * 60;

const INT4_MAX = 2_147_483_647;

export interface PlanTier {
  id: string;
  priceCents: number;
  capacity: number;
  maxPerOrder: number;
  paid: number;
  reserved: number;
}

export type PlanErrorCode = "empty" | "event-unavailable" | "invalid-tier" | "over-limit" | "sold-out" | "free-order";

export interface PlanItem {
  ticketTypeId: string;
  quantity: number;
  unitPriceCents: number;
}

/** AC1/D5: valida y calcula la orden con precio y cupo de la BD (los tipos ya vienen bloqueados). */
export function planOrder(i: {
  event: { status: string; startsAt: Date };
  tiers: PlanTier[];
  lines: { ticketTypeId: string; quantity: number }[];
  now: Date;
}): { ok: true; items: PlanItem[]; totalCents: number } | { ok: false; code: PlanErrorCode } {
  if (i.lines.length === 0) return { ok: false, code: "empty" };
  // D19: solo se vende un evento publicado y estrictamente futuro.
  if (i.event.status !== "published" || !(i.event.startsAt.getTime() > i.now.getTime())) {
    return { ok: false, code: "event-unavailable" };
  }

  // Una línea repetida no puede esquivar el tope: se suman por tipo (Zod ya las rechaza).
  const wanted = new Map<string, number>();
  for (const l of i.lines) wanted.set(l.ticketTypeId, (wanted.get(l.ticketTypeId) ?? 0) + l.quantity);

  const items: PlanItem[] = [];
  let totalCents = 0;
  for (const [ticketTypeId, quantity] of wanted) {
    const tier = i.tiers.find((t) => t.id === ticketTypeId);
    if (!tier) return { ok: false, code: "invalid-tier" };
    if (quantity > tier.maxPerOrder) return { ok: false, code: "over-limit" };
    if (quantity > tierAvailable(tier)) return { ok: false, code: "sold-out" };
    totalCents += tier.priceCents * quantity;
    if (totalCents > INT4_MAX) return { ok: false, code: "over-limit" };
    items.push({ ticketTypeId, quantity, unitPriceCents: tier.priceCents });
  }

  // Q2: un total 0 no admite PaymentIntent.
  if (totalCents <= 0) return { ok: false, code: "free-order" };
  return { ok: true, items, totalCents };
}
