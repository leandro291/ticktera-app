import type { AvailabilityStatus } from "../types/event";

/** D6: cupo libre = capacidad − pagadas − pendientes vigentes, nunca negativo. */
export function tierAvailable(t: { capacity: number; paid: number; reserved: number }): number {
  return Math.max(0, t.capacity - t.paid - t.reserved);
}

/** D6: agotada sin cupo; "últimas" con ≤ max(10, 10 % de la capacidad). */
export function tierStatus(t: { capacity: number; available: number }): AvailabilityStatus {
  if (t.available <= 0) return "sold-out";
  return t.available <= Math.max(10, t.capacity * 0.1) ? "last-tickets" : "available";
}

/** D6: agotado si lo están todas sus zonas (o no tiene), "últimas" si alguna lo está. */
export function eventStatus(tiers: { status: AvailabilityStatus }[]): AvailabilityStatus {
  if (tiers.every((t) => t.status === "sold-out")) return "sold-out";
  return tiers.some((t) => t.status === "last-tickets") ? "last-tickets" : "available";
}

/** D7: el precio más bajo entre las zonas con cupo; si todas están agotadas, el más bajo de todas. */
export function priceFromCents(tiers: { priceCents: number; available: number }[]): number | null {
  if (!tiers.length) return null;
  const open = tiers.filter((t) => t.available > 0);
  return Math.min(...(open.length ? open : tiers).map((t) => t.priceCents));
}
