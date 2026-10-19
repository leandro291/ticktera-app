export type CheckoutErrorCode =
  | "unauthenticated"
  | "suspended"
  | "forbidden" // requirePermission
  | "invalid-input"
  | "event-unavailable"
  | "invalid-tier"
  | "over-limit"
  | "sold-out"
  | "free-order" // planOrder
  | "payment-unavailable"
  | "unexpected";

export class CheckoutError extends Error {
  readonly code: CheckoutErrorCode;

  constructor(code: CheckoutErrorCode) {
    super(code);
    this.name = "CheckoutError";
    this.code = code;
  }
}

export type StartCheckoutResult =
  | { ok: true; orderCode: string; clientSecret: string; expiresInSeconds: number; totalCents: number }
  | { ok: false; code: CheckoutErrorCode; error: string; fieldErrors?: Record<string, string[]> };
