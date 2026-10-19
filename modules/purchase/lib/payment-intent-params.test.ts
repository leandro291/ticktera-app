import { describe, expect, it } from "vitest";
import { buildPaymentIntentParams } from "./payment-intent-params";

describe("buildPaymentIntentParams", () => {
  const params = buildPaymentIntentParams({ orderId: "ord-1", totalCents: 12345 });

  it("AC8: amount es total_cents y la moneda es pen", () => {
    expect(params.amount).toBe(12345);
    expect(params.currency).toBe("pen");
  });

  it("AC8: solo tarjeta", () => {
    expect(params.allowed_payment_method_types).toEqual(["card"]);
    expect(params.automatic_payment_methods).toBeUndefined();
  });

  it("AC8: metadata.order_id es el id de la orden", () => {
    expect(params.metadata).toEqual({ order_id: "ord-1" });
  });
});
