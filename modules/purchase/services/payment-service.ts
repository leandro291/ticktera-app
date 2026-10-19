import { db } from "@/db";
import { payments } from "@/db/schema";
import { getStripe } from "@/lib/stripe";
import { buildPaymentIntentParams } from "../lib/payment-intent-params";

/**
 * AC8: se llama DESPUÉS del commit de la orden (D2). La clave de idempotencia es el id de la orden: un reintento
 * recibe el mismo PaymentIntent y el insert no duplica. Los errores (Stripe, config) los maneja `startCheckout`.
 */
export async function createPaymentForOrder(o: { orderId: string; totalCents: number }): Promise<{ clientSecret: string }> {
  const intent = await getStripe().paymentIntents.create(buildPaymentIntentParams(o), { idempotencyKey: o.orderId });
  if (!intent.client_secret) throw new Error(`PaymentIntent ${intent.id} has no client_secret`);

  await db
    .insert(payments)
    .values({ orderId: o.orderId, stripePaymentIntentId: intent.id, amountCents: o.totalCents })
    .onConflictDoNothing({ target: payments.stripePaymentIntentId });

  return { clientSecret: intent.client_secret };
}

/** Best-effort (D4, AC9): evita cobros tardíos evitables; un fallo (p. ej. ya `succeeded`) se registra y no corta nada. */
export async function cancelPaymentIntents(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  let stripe;
  try {
    stripe = getStripe();
  } catch (e) {
    console.error("payment: cannot cancel payment intents", e instanceof Error ? e.name : typeof e);
    return;
  }
  await Promise.all(
    ids.map((id) =>
      stripe.paymentIntents.cancel(id).catch((e: unknown) => {
        // Solo id y código: el `raw` de un StripeError trae el PaymentIntent entero (client_secret, metadata).
        console.error("payment: payment intent cancel failed", id, (e as { code?: unknown } | null)?.code);
      }),
    ),
  );
}
