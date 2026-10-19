import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { ORDER_HOLD_SECONDS } from "../lib/order-plan";
import type { StartCheckoutInput } from "../schemas/checkout-schema";
import { CheckoutError, type StartCheckoutResult } from "../types/checkout";
import { createPendingOrder } from "./order-service";
import { cancelPaymentIntents, createPaymentForOrder } from "./payment-service";

/** AC9 / D2: Stripe falló o no está configurado, se vence la orden en el acto para liberar el cupo. */
async function expireOrder(orderId: string): Promise<void> {
  await db.transaction(async (tx) => {
    // `status = 'pending'`: si el webhook ya la pagó (carrera mínima) no se toca.
    const expired = await tx
      .update(orders)
      .set({ status: "expired" })
      .where(and(eq(orders.id, orderId), eq(orders.status, "pending")))
      .returning({ id: orders.id });
    if (expired.length > 0) {
      await tx
        .update(payments)
        .set({ status: "failed" })
        .where(and(eq(payments.orderId, orderId), eq(payments.status, "pending")));
    }
  });
}

/**
 * AC8/AC9: orden (commit) -> PaymentIntent fuera de la transacción (D2). Lanza CheckoutError.
 * Si Stripe falla, la orden vence y se lanza `payment-unavailable`; en ambos caminos se cancelan, best-effort,
 * los PaymentIntents de las reservas liberadas (D4).
 */
export async function startCheckout(
  actor: { id: string },
  input: StartCheckoutInput,
): Promise<Extract<StartCheckoutResult, { ok: true }>> {
  const order = await createPendingOrder(actor, input);
  const releasedIds = order.released.map((r) => r.paymentIntentId);

  let clientSecret: string;
  try {
    ({ clientSecret } = await createPaymentForOrder({ orderId: order.orderId, totalCents: order.totalCents }));
  } catch (e) {
    // Sin detalles de Stripe al cliente (AC9): se registra y se responde con el código de dominio.
    console.error("checkout: payment intent creation failed", order.orderId, e);
    await expireOrder(order.orderId).catch((err) => console.error("checkout: expiring order failed", order.orderId, err));
    await cancelPaymentIntents(releasedIds);
    throw new CheckoutError("payment-unavailable");
  }
  await cancelPaymentIntents(releasedIds);

  // Segundos restantes con el reloj de la BD (no `expiresAt - Date.now()`: desfase app/BD), acotados a la reserva.
  const [{ remaining }] = await db
    .select({ remaining: sql<number>`extract(epoch from ${orders.expiresAt} - now())::float8` })
    .from(orders)
    .where(eq(orders.id, order.orderId));

  return {
    ok: true,
    orderCode: order.code,
    clientSecret,
    expiresInSeconds: Math.min(ORDER_HOLD_SECONDS, Math.max(0, Math.floor(remaining))),
    totalCents: order.totalCents,
  };
}
