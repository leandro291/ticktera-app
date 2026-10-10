import type { TierInput } from "../types/event-write";

export interface CurrentTier {
  id: string;
  name: string;
  priceCents: number;
  capacity: number;
  maxPerOrder: number;
  paid: number;
  reserved: number; // pending con expires_at > now()
  orderItems: number; // cualquier order_items (también expired/refunded)
}

export interface EventPlace {
  startsAt: Date;
  venueName: string;
  address: string;
  city: string;
}

export type FreezeIssueCode =
  | "tier-not-found"
  | "duplicate-tier-id"
  | "tier-price-locked"
  | "tier-name-locked"
  | "tier-capacity-below-committed"
  | "tier-remove-locked"
  | "tier-remove-has-orders"
  | "buyer-impact-unacknowledged";

export interface FreezeIssue {
  code: FreezeIssueCode;
  tierId?: string;
  min?: number;
}

/** Entradas vendidas o reservadas vigentes. */
export function committed(t: Pick<CurrentTier, "paid" | "reserved">): number {
  return t.paid + t.reserved;
}

const placeChanged = (a: EventPlace, b: EventPlace) =>
  a.startsAt.getTime() !== b.startsAt.getTime() || a.venueName !== b.venueName || a.address !== b.address || a.city !== b.city;

/** D5/D6: qué cambios rechaza un evento con ventas. Sin ventas solo valida ids y tipos con órdenes. */
export function checkFrozenEdit(
  current: { place: EventPlace; tiers: CurrentTier[] },
  next: { place: EventPlace; tiers: TierInput[] },
  acknowledgeBuyerImpact: boolean,
): FreezeIssue[] {
  const issues: FreezeIssue[] = [];
  const byId = new Map(current.tiers.map((t) => [t.id, t]));
  const kept = new Set<string>();

  for (const tier of next.tiers) {
    if (tier.id === undefined) continue; // agregar tipos siempre se permite
    if (kept.has(tier.id)) {
      issues.push({ code: "duplicate-tier-id", tierId: tier.id });
      continue;
    }
    kept.add(tier.id);
    const cur = byId.get(tier.id);
    if (!cur) {
      issues.push({ code: "tier-not-found", tierId: tier.id });
      continue;
    }
    const sold = committed(cur);
    if (sold === 0) continue;
    if (tier.priceCents !== cur.priceCents) issues.push({ code: "tier-price-locked", tierId: cur.id });
    // order_items no guarda el nombre: renombrar cambiaría lo que ve quien ya compró.
    if (tier.name !== cur.name) issues.push({ code: "tier-name-locked", tierId: cur.id });
    // Datos viejos con capacity < comprometido no bloquean mientras no se baje más.
    const min = Math.min(sold, cur.capacity);
    if (tier.capacity < min) issues.push({ code: "tier-capacity-below-committed", tierId: cur.id, min });
  }

  for (const cur of current.tiers) {
    if (kept.has(cur.id)) continue;
    if (committed(cur) > 0) issues.push({ code: "tier-remove-locked", tierId: cur.id });
    else if (cur.orderItems > 0) issues.push({ code: "tier-remove-has-orders", tierId: cur.id });
  }

  const hasSales = current.tiers.some((t) => committed(t) > 0);
  if (hasSales && !acknowledgeBuyerImpact && placeChanged(current.place, next.place)) {
    issues.push({ code: "buyer-impact-unacknowledged" });
  }
  return issues;
}

export const FREEZE_MESSAGES: Record<FreezeIssueCode, (i: FreezeIssue) => string> = {
  "tier-not-found": () => "Este tipo de entrada no pertenece al evento.",
  "duplicate-tier-id": () => "Este tipo de entrada está repetido.",
  "tier-price-locked": () => "Ya tiene entradas vendidas o reservadas: no puedes cambiar el precio.",
  "tier-name-locked": () => "Ya tiene entradas vendidas o reservadas: no puedes cambiar el nombre.",
  "tier-capacity-below-committed": (i) => `No puede ser menor que ${i.min} (entradas vendidas o reservadas).`,
  "tier-remove-locked": () => "Ya tiene entradas vendidas o reservadas: no puedes quitarlo.",
  "tier-remove-has-orders": () => "Tiene órdenes asociadas: no puedes quitarlo. Retíralo con capacidad 0.",
  "buyer-impact-unacknowledged": () =>
    "Ya hay entradas vendidas o reservadas. Confirma que quieres cambiar la fecha o el lugar: hoy no avisamos a los compradores.",
};
