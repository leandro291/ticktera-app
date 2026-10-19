import type Stripe from "stripe";

// AC8: solo tarjeta y soles. stripe v23 quitó `payment_method_types` del create: el equivalente es `allowed_payment_method_types`.
export function buildPaymentIntentParams(o: { orderId: string; totalCents: number }): Stripe.PaymentIntentCreateParams {
  return {
    amount: o.totalCents,
    currency: "pen",
    allowed_payment_method_types: ["card"],
    metadata: { order_id: o.orderId },
  };
}
