import type { NextRequest } from "next/server"
import { env } from "@/lib/env"
import { authorizeInternalCall, expireOrders } from "@/modules/purchase/server"

// La BD y el SDK de Stripe requieren Node.js. Un POST nunca se cachea; `force-dynamic` lo deja explícito.
export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Sin PII: `DrizzleQueryError` trae el SQL con sus params. Se loguea solo el error de pg (`cause`: name/code/message,
// sin params) o, si no hay, el nombre del error. Nunca el objeto completo.
function errorSummary(err: unknown) {
  if (!(err instanceof Error)) return { name: typeof err }
  if (!(err.cause instanceof Error)) return { name: err.name }
  const { code } = err.cause as { code?: unknown }
  return { name: err.name, cause: { name: err.cause.name, code, message: err.cause.message } }
}

// AC19-AC21 (D12): falla cerrada. Nunca se loguea ni se devuelve el secreto, el token ni el mensaje de un error.
export async function POST(req: NextRequest) {
  const auth = await authorizeInternalCall(
    { authorization: req.headers.get("authorization") },
    {
      secret: env.INTERNAL_JOB_SECRET,
      audience: env.EXPIRE_ORDERS_AUDIENCE,
      serviceAccount: env.EXPIRE_ORDERS_SERVICE_ACCOUNT,
    },
  )
  if (!auth.ok) return new Response(null, { status: auth.status })

  try {
    const { expired, cancelledIntents } = await expireOrders()
    return Response.json({ expired, cancelledIntents })
  } catch (err) {
    console.error("Expire orders failed", { error: errorSummary(err) })
    return new Response("Expire orders error", { status: 500 })
  }
}
