import Stripe from "stripe"
import { env } from "@/lib/env"

export class PaymentsNotConfiguredError extends Error {
  constructor() {
    super("Stripe is not configured: STRIPE_SECRET_KEY is missing")
    this.name = "PaymentsNotConfiguredError"
  }
}

let client: Stripe | undefined

// Lazy so `next build` never needs the secret (checkout D8). Fails closed. apiVersion is left to the SDK's pinned default.
export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) throw new PaymentsNotConfiguredError()
  return (client ??= new Stripe(env.STRIPE_SECRET_KEY))
}
