import type { NextRequest } from "next/server"
import type Stripe from "stripe"
import { env } from "@/lib/env"
import { getStripe, PaymentsNotConfiguredError } from "@/lib/stripe"
import { handleStripeEvent } from "@/modules/purchase/server"

// El SDK de Stripe y la BD requieren Node.js. Un POST nunca se cachea; `force-dynamic` lo deja explícito.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Sin PII: `DrizzleQueryError` trae el SQL con sus params (datos del comprador, códigos). Se loguea solo el error de pg
// (`cause`: name/code/message, sin params) o, si no hay, el nombre del error. Nunca el objeto completo.
function errorSummary(err: unknown) {
  if (!(err instanceof Error)) return { name: typeof err }
  if (!(err.cause instanceof Error)) return { name: err.name }
  const { code } = err.cause as { code?: unknown }
  return { name: err.name, cause: { name: err.cause.name, code, message: err.cause.message } }
}

// AC13: cuerpo crudo + firma. Nunca se loguea el secreto, la firma ni el payload; nunca se devuelve el mensaje de un error.
export async function POST(req: NextRequest) {
  // Falla cerrada (D8): sin clave o sin secreto del webhook no se procesa nada.
  const secret = env.STRIPE_WEBHOOK_SECRET
  let stripe: Stripe
  try {
    stripe = getStripe()
  } catch (err) {
    if (!(err instanceof PaymentsNotConfiguredError)) throw err
    return new Response("Payments not configured", { status: 503 })
  }
  if (!secret) return new Response("Payments not configured", { status: 503 })

  const signature = req.headers.get("stripe-signature")
  if (!signature) return new Response("Missing signature", { status: 400 })

  // La firma se calcula sobre el texto exacto: no parsear antes (tolerancia por defecto del SDK: 300 s).
  const raw = await req.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret)
  } catch {
    return new Response("Invalid signature", { status: 400 })
  }

  try {
    await handleStripeEvent(event)
    return new Response("OK", { status: 200 })
  } catch (err) {
    // Sin PII ni cuerpo del evento: solo tipo, id y el resumen del error. 500 => Stripe reintenta.
    console.error("Stripe webhook failed", { type: event.type, id: event.id, error: errorSummary(err) })
    return new Response("Webhook handler error", { status: 500 })
  }
}
