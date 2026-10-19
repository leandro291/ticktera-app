import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { events, orderItems, orders, payments, ticketTypes, users } from "@/db/schema";
import { lockAndLoadTiers } from "@/modules/event/server";
import { generateOrderCode } from "../lib/order-code";
import { ORDER_HOLD_SECONDS, planOrder } from "../lib/order-plan";
import type { StartCheckoutInput } from "../schemas/checkout-schema";
import { CheckoutError } from "../types/checkout";

const MAX_CODE_ATTEMPTS = 5;

/**
 * D2-D7: crea la orden `pending` en una sola transacción. Orden de locks fijo (D3): `orders` → `ticket_types`.
 * Lanza CheckoutError; si cualquier paso falla no queda nada (tampoco se libera la reserva anterior).
 * El PaymentIntent se crea después del commit (D2): acá solo se devuelven los de las reservas liberadas.
 */
export async function createPendingOrder(
  actor: { id: string },
  input: StartCheckoutInput,
  now = new Date(),
): Promise<{
  orderId: string;
  code: string;
  totalCents: number;
  expiresAt: Date;
  released: { paymentIntentId: string }[];
}> {
  const [event] = await db.select({ id: events.id }).from(events).where(eq(events.slug, input.eventSlug));
  if (!event) throw new CheckoutError("event-unavailable");

  return db.transaction(async (tx) => {
    // D4: una reserva por usuario y evento. Dos compras paralelas del mismo usuario (doble clic) aún no ven la orden
    // de la otra, así que se serializan con un advisory lock transaccional. Va primero y nada lo espera
    // (el webhook no lo toma), por lo que no altera el orden de locks `orders` → `ticket_types` (D3).
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${actor.id}), hashtext(${event.id}))`);
    // Se bloquean sus `pending` vigentes (por id) y se vencen.
    const ofThisEvent = tx
      .select({ id: orderItems.orderId })
      .from(orderItems)
      .innerJoin(ticketTypes, eq(ticketTypes.id, orderItems.ticketTypeId))
      .where(eq(ticketTypes.eventId, event.id));
    const own = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.userId, actor.id),
          eq(orders.status, "pending"),
          gt(orders.expiresAt, sql`now()`),
          inArray(orders.id, ofThisEvent),
        ),
      )
      .orderBy(asc(orders.id))
      .for("update");

    let released: { paymentIntentId: string }[] = [];
    if (own.length > 0) {
      const ownIds = own.map((o) => o.id);
      await tx.update(orders).set({ status: "expired" }).where(inArray(orders.id, ownIds));
      const failed = await tx
        .update(payments)
        .set({ status: "failed" })
        .where(and(inArray(payments.orderId, ownIds), eq(payments.status, "pending")))
        .returning({ paymentIntentId: payments.stripePaymentIntentId });
      released = failed;
    }

    // D3/D5: lock de los tipos del evento (por id) y recién después se lee el evento (D19, sin lock de `events`).
    const tiers = await lockAndLoadTiers(tx, event.id);
    const [current] = await tx
      .select({ status: events.status, startsAt: events.startsAt })
      .from(events)
      .where(eq(events.id, event.id));
    if (!current) throw new CheckoutError("event-unavailable");

    const plan = planOrder({ event: current, tiers, lines: input.lines, now });
    // "empty" no está en CheckoutErrorCode: Zod ya exige ≥ 1 línea, así que equivale a input inválido.
    if (!plan.ok) throw new CheckoutError(plan.code === "empty" ? "invalid-input" : plan.code);

    // D6: el choque de código no rompe la transacción (ON CONFLICT DO NOTHING) y se reintenta.
    let created: { id: string; code: string; expiresAt: Date } | undefined;
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS && !created; attempt++) {
      [created] = await tx
        .insert(orders)
        .values({
          userId: actor.id,
          code: generateOrderCode(),
          totalCents: plan.totalCents,
          // Reloj de la BD, el mismo que usa la disponibilidad (`expires_at > now()`).
          expiresAt: sql`now() + make_interval(secs => ${ORDER_HOLD_SECONDS})`,
        })
        .onConflictDoNothing({ target: orders.code })
        .returning({ id: orders.id, code: orders.code, expiresAt: orders.expiresAt });
    }
    if (!created) throw new CheckoutError("unexpected");

    await tx.insert(orderItems).values(plan.items.map((i) => ({ orderId: created.id, ...i })));

    // D7: datos del comprador en `users` (el correo es el de la cuenta y no se toca).
    const { fullName, phone, documentType, documentNumber } = input.buyer;
    await tx.update(users).set({ fullName, phone, documentType, documentNumber }).where(eq(users.id, actor.id));

    return {
      orderId: created.id,
      code: created.code,
      totalCents: plan.totalCents,
      expiresAt: created.expiresAt,
      released,
    };
  });
}
