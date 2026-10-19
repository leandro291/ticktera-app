import { tierAvailable } from "@/modules/event";

export type PaymentDecision =
  | { action: "issue" } // pagar y emitir
  | { action: "noop" } // ya paid / refunded
  | { action: "refund"; reason: "no-capacity" | "event-unavailable" };

type OrderStatus = "pending" | "paid" | "expired" | "refunded";

/**
 * D10: pago tardío = orden `expired`, o `pending` ya vencida (el job puede no haber corrido).
 * Única fuente de verdad: la usan `decideSucceeded` y el servicio del webhook (si divergieran, el servicio podría
 * emitir sin haber chequeado el cupo).
 */
export function isLatePayment(order: { status: OrderStatus; expiresAt: Date }, now: Date): boolean {
  return order.status === "expired" || (order.status === "pending" && order.expiresAt.getTime() <= now.getTime());
}

/**
 * AC16/D10: decide qué hacer con un `payment_intent.succeeded`.
 * `items[].tier.reserved` son las pendientes vigentes de OTRAS órdenes (la tardía no cuenta: su reserva ya venció).
 */
export function decideSucceeded(i: {
  order: { status: OrderStatus; expiresAt: Date };
  now: Date;
  event: { status: string; startsAt: Date };
  items: { quantity: number; tier: { capacity: number; paid: number; reserved: number } }[];
}): PaymentDecision {
  if (i.order.status === "paid" || i.order.status === "refunded") return { action: "noop" };

  // A tiempo: se honra siempre, aunque el evento se haya cancelado después (event-crud D19).
  if (!isLatePayment(i.order, i.now)) return { action: "issue" };

  // Tardío (`expired`, o `pending` con expires_at <= now sin job). Misma regla D19 que una venta nueva (ver planOrder).
  if (i.event.status !== "published" || !(i.event.startsAt.getTime() > i.now.getTime())) {
    return { action: "refund", reason: "event-unavailable" };
  }
  if (i.items.some((it) => it.quantity > tierAvailable(it.tier))) return { action: "refund", reason: "no-capacity" };
  return { action: "issue" };
}

export type PaymentPlan =
  | { action: "issue" }
  | { action: "noop" }
  | { action: "refund"; callStripe: boolean } // `callStripe: false` ⇒ ya está reembolsado del todo, solo se actualiza la BD
  | { action: "already-refunded"; partial: boolean }; // iba a emitir pero Stripe ya devolvió dinero: no se emite ni se reembolsa

/**
 * Cruza la decisión con lo ya reembolsado en Stripe (`charge.amount_refunded`, `amount` del PaymentIntent), para no
 * duplicar dinero (reembolso hecho y transacción revertida, o reembolso manual desde el dashboard + reintento tardío).
 *
 * - `refund` y ya reembolsado del todo ⇒ no se llama a `refunds.create` (fallaría con `charge_already_refunded`). Si el
 *   reembolso es parcial sí se llama: sin `amount`, Stripe devuelve solo el resto.
 * - `issue` y CUALQUIER reembolso (parcial o total) ⇒ no se emiten tickets. Criterio más seguro: con un reembolso parcial
 *   no hay forma de saber si el cliente ya "devolvió" parte de la compra; emitir sería entregar entradas por menos
 *   de lo cobrado. El resto queda para revisión manual (el servicio lo loguea).
 * - `noop` se respeta tal cual.
 */
export function applyRefundState(decision: PaymentDecision, charge: { amount: number; amountRefunded: number }): PaymentPlan {
  const { amount, amountRefunded } = charge;
  if (decision.action === "refund") return { action: "refund", callStripe: !(amountRefunded >= amount) };
  if (decision.action === "issue" && amountRefunded > 0) return { action: "already-refunded", partial: amountRefunded < amount };
  return decision;
}
