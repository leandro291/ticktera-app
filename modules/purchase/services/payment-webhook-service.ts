import { eq, sql } from "drizzle-orm";
import type Stripe from "stripe";
import { db } from "@/db";
import { events, orderItems, orders, payments, stripeEvents, ticketTypes, tickets, users } from "@/db/schema";
import { lockAndLoadTiers, type Tx } from "@/modules/event/server";
import { getStripe } from "@/lib/stripe";
import { applyRefundState, decideSucceeded, isLatePayment } from "../lib/late-payment";
import { generateTicketCode } from "../lib/order-code";

export type WebhookOutcome =
  | "paid"
  | "late-honored"
  | "late-refunded"
  | "already-processed"
  | "already-paid"
  | "amount-mismatch"
  | "ignored";

const MAX_TICKET_CODE_ATTEMPTS = 5;

/** D6: una fila por unidad. El choque de código (UNIQUE) no rompe la transacción: se reintenta con códigos nuevos. */
async function insertTickets(tx: Tx, orderItemId: string, holderName: string, quantity: number) {
  let missing = quantity;
  for (let attempt = 0; attempt < MAX_TICKET_CODE_ATTEMPTS && missing > 0; attempt++) {
    const rows = await tx
      .insert(tickets)
      .values(Array.from({ length: missing }, () => ({ orderItemId, code: generateTicketCode(), holderName })))
      .onConflictDoNothing({ target: tickets.code })
      .returning({ id: tickets.id });
    missing -= rows.length;
  }
  // Si no se pudo emitir todo, se revierte la transacción y Stripe reintenta.
  if (missing > 0) throw new Error(`webhook: could not generate unique ticket codes for order item ${orderItemId}`);
}

/**
 * AC14-AC17 / D9-D10: procesa un evento de Stripe ya verificado (firma validada por el route handler).
 *
 * - Solo maneja `payment_intent.succeeded`; el resto, un PaymentIntent sin fila en `payments` o con `metadata.order_id`
 *   distinto de la orden de la fila ⇒ `"ignored"` (sin registrar el evento).
 * - Idempotente: el `event.id` se registra en `stripe_events` dentro de la MISMA transacción que los efectos
 *   (`"already-processed"` si ya estaba). Si algo falla se revierte todo, incluido el registro, y la función LANZA:
 *   el route handler debe responder 500 para que Stripe reintente. Cualquier otro resultado ⇒ 200.
 * - `amount_received` ≠ `payments.amount_cents` ⇒ `"amount-mismatch"`: no emite nada, `console.error` solo de ids. Se
 *   decide ANTES de registrar el evento: el operador puede reenviarlo desde el dashboard tras corregir. Sin reembolso
 *   automático (AC17: queda manual).
 * - Reembolsos previos (`charge.amount_refunded`) ⇒ nunca se emiten tickets ni se reembolsa dos veces (`applyRefundState`).
 * - Orden de locks fijo (D3): `orders` → `ticket_types`. No toma el advisory lock del checkout.
 * - El reembolso automático (pago tardío sin cupo, D10) se hace DENTRO de la transacción; la `idempotencyKey` lo hace seguro.
 * - `getStripe()` lanza `PaymentsNotConfiguredError` si falta la clave (el route handler ya lo cubre con un 503).
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<WebhookOutcome> {
  if (event.type !== "payment_intent.succeeded") return "ignored";
  const intent = event.data.object;

  // Lectura sin lock: `order_id`, `amount_cents` y `payment_intent` no cambian después de crear la fila.
  const [payment] = await db
    .select({ id: payments.id, orderId: payments.orderId, amountCents: payments.amountCents })
    .from(payments)
    .where(eq(payments.stripePaymentIntentId, intent.id));
  if (!payment || intent.metadata?.order_id !== payment.orderId) return "ignored";

  // AC17: monto distinto del de la orden ⇒ nada se emite y el evento NO se registra (se puede reenviar tras corregir).
  if (intent.amount_received !== payment.amountCents) {
    console.error("webhook: amount mismatch", {
      eventId: event.id,
      paymentIntentId: intent.id,
      orderId: payment.orderId,
      expected: payment.amountCents,
      received: intent.amount_received,
    });
    return "amount-mismatch";
  }

  // Una llamada de red nunca con un lock abierto (D9): el charge se lee antes de la transacción.
  // Si `retrieve` falla, LANZA (500 y Stripe reintenta): no se degrada a null, porque es la única fuente de
  // `amount_refunded` y sin él se podría emitir sobre un pago ya reembolsado.
  const client = getStripe();
  const full = await client.paymentIntents.retrieve(intent.id, { expand: ["latest_charge"] });
  // Falla cerrada: sin el cargo expandido no se puede saber si hay reembolsos (500 y Stripe reintenta).
  // Un reembolso manual entre este `retrieve` y el commit queda para #23 (`charge.refunded`).
  const charge = full.latest_charge;
  if (!charge || typeof charge !== "object") throw new Error("webhook: latest_charge not expanded");
  const card = charge.payment_method_details?.card;
  const refundedCharge = { amount: full.amount, amountRefunded: charge.amount_refunded };

  return db.transaction(async (tx): Promise<WebhookOutcome> => {
    const registered = await tx
      .insert(stripeEvents)
      .values({ id: event.id, type: event.type })
      .onConflictDoNothing({ target: stripeEvents.id })
      .returning({ id: stripeEvents.id });
    if (registered.length === 0) return "already-processed";

    // D3: primero la orden (solo su fila, no la de `users`), luego los tipos.
    const [order] = await tx
      .select({
        status: orders.status,
        expiresAt: orders.expiresAt,
        holderName: users.fullName,
        now: sql<Date>`now()`, // D10: hora de inicio de la transacción, la misma que usa `loadTiers` para `reserved`
      })
      .from(orders)
      .innerJoin(users, eq(users.id, orders.userId))
      .where(eq(orders.id, payment.orderId))
      .for("update", { of: orders });
    if (!order) throw new Error(`webhook: order ${payment.orderId} not found`);
    const now = new Date(order.now);
    const expiresAt = new Date(order.expiresAt);

    const items = await tx
      .select({
        id: orderItems.id,
        quantity: orderItems.quantity,
        ticketTypeId: orderItems.ticketTypeId,
        eventId: ticketTypes.eventId,
      })
      .from(orderItems)
      .innerJoin(ticketTypes, eq(ticketTypes.id, orderItems.ticketTypeId))
      .where(eq(orderItems.orderId, payment.orderId));
    if (items.length === 0) throw new Error(`webhook: order ${payment.orderId} has no items`);
    const eventId = items[0].eventId;

    // D10: solo si es tardío se bloquean los tipos: `reserved` de `lockAndLoadTiers` ya excluye a la orden tardía
    // (no está `pending` vigente).
    const late = isLatePayment({ status: order.status, expiresAt }, now);
    const tiers = late ? await lockAndLoadTiers(tx, eventId) : [];
    // D19: el evento se lee después del lock de tipos, sin lock de `events`.
    const [ev] = await tx.select({ status: events.status, startsAt: events.startsAt }).from(events).where(eq(events.id, eventId));
    if (!ev) throw new Error(`webhook: event ${eventId} not found`);

    const decision = decideSucceeded({
      order: { status: order.status, expiresAt },
      now,
      event: ev,
      // A tiempo (o ya cerrada) `decideSucceeded` no mira los tipos.
      items: late
        ? items.map((it) => {
            const tier = tiers.find((t) => t.id === it.ticketTypeId);
            if (!tier) throw new Error(`webhook: ticket type ${it.ticketTypeId} not found`);
            return { quantity: it.quantity, tier };
          })
        : [],
    });

    const plan = applyRefundState(decision, refundedCharge);

    if (plan.action === "noop") return "already-paid";

    if (plan.action === "refund" || plan.action === "already-refunded") {
      if (plan.action === "already-refunded" && plan.partial) {
        // Reembolso parcial previo: sin tickets, el resto del cobro queda para revisión manual (solo ids).
        console.error("webhook: partial refund on a payment to issue", {
          eventId: event.id,
          paymentIntentId: intent.id,
          orderId: payment.orderId,
        });
      }
      // timeout corto: esta llamada retiene los locks de la orden y de `ticket_types`; si expira todo revierte y Stripe reintenta.
      if (plan.action === "refund" && plan.callStripe) {
        await client.refunds.create(
          { payment_intent: intent.id },
          { idempotencyKey: `auto-refund:${payment.orderId}`, timeout: 10_000 },
        );
      }
      await tx.update(payments).set({ status: "refunded" }).where(eq(payments.id, payment.id));
      await tx.update(orders).set({ status: "expired" }).where(eq(orders.id, payment.orderId));
      return "late-refunded";
    }

    await tx.update(orders).set({ status: "paid", paidAt: now }).where(eq(orders.id, payment.orderId));
    await tx
      .update(payments)
      .set({
        status: "succeeded",
        stripeChargeId: charge?.id ?? null,
        cardBrand: card?.brand ?? null,
        cardLast4: card?.last4 ?? null,
      })
      .where(eq(payments.id, payment.id));
    for (const it of items) await insertTickets(tx, it.id, order.holderName, it.quantity);
    return late ? "late-honored" : "paid";
  });
}
