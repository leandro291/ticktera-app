import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { getStripe } from "@/lib/stripe";

const EXPIRE_BATCH_SIZE = 200;

// Sin PII ni secretos: solo tipo/código del error (un `StripeError` trae `type`/`code`; un error de BD, el `code` de pg).
function errorSummary(err: unknown) {
  if (!(err instanceof Error)) return { name: typeof err };
  const { type, code } = err as { type?: unknown; code?: unknown };
  const cause = err.cause as { code?: unknown } | undefined;
  return { name: err.name, type, code: code ?? cause?.code };
}

/**
 * AC20/AC21 (D11): vence en lote las `pending` con `expires_at <= now`. Solo toma locks de `orders` (con `SKIP LOCKED`:
 * no espera a un checkout/webhook que tenga la fila ni cierra ciclos de D3); no toca `ticket_types`.
 * Los PaymentIntents se cancelan DESPUÉS del commit (D9); un error de Stripe se registra y no aborta el lote.
 * `now` omitido = reloj de la BD (como el resto del checkout).
 */
export async function expireOrders(
  now?: Date,
  limit = EXPIRE_BATCH_SIZE,
): Promise<{ expired: number; cancelledIntents: number }> {
  const { expiredCount, intentIds } = await db.transaction(async (tx) => {
    // El lock de fila reevalúa el WHERE: una orden que el webhook pagó entre medio no sale (AC21).
    const rows = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.status, "pending"), lte(orders.expiresAt, now ?? sql`now()`)))
      .orderBy(asc(orders.expiresAt))
      .limit(limit)
      .for("update", { skipLocked: true });
    if (rows.length === 0) return { expiredCount: 0, intentIds: [] as string[] };

    const ids = rows.map((r) => r.id);
    const expired = await tx
      .update(orders)
      .set({ status: "expired" })
      .where(and(inArray(orders.id, ids), eq(orders.status, "pending")))
      .returning({ id: orders.id });
    const failed = await tx
      .update(payments)
      .set({ status: "failed" })
      .where(and(inArray(payments.orderId, expired.map((o) => o.id)), eq(payments.status, "pending")))
      .returning({ intentId: payments.stripePaymentIntentId });
    return { expiredCount: expired.length, intentIds: failed.map((p) => p.intentId) };
  });

  // Commit hecho, sin locks abiertos (D9). Best-effort: p. ej. `payment_intent_unexpected_state` si ya `succeeded`.
  let cancelledIntents = 0;
  if (intentIds.length > 0) {
    try {
      const stripe = getStripe();
      const results = await Promise.allSettled(intentIds.map((id) => stripe.paymentIntents.cancel(id)));
      results.forEach((r, i) => {
        if (r.status === "fulfilled") cancelledIntents++;
        else console.error("expire-orders: payment intent cancel failed", { id: intentIds[i], error: errorSummary(r.reason) });
      });
    } catch (e) {
      console.error("expire-orders: cannot cancel payment intents", { count: intentIds.length, error: errorSummary(e) });
    }
  }

  return { expired: expiredCount, cancelledIntents };
}
