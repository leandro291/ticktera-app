import type { NextRequest } from "next/server"
import { verifyWebhook } from "@clerk/nextjs/webhooks"
import { profileFromWebhook } from "@/modules/auth/lib/clerk-profile"
import { suspendClerkUser, syncClerkUser } from "@/modules/auth/server"

export async function POST(req: NextRequest) {
  let evt
  try {
    evt = await verifyWebhook(req)
  } catch (err) {
    console.error("Clerk webhook: invalid signature", err)
    return new Response("Invalid signature", { status: 400 })
  }

  try {
    if (evt.type === "user.created" || evt.type === "user.updated") {
      // null = primary email missing/unverified: nothing to persist (200, no retry).
      const profile = profileFromWebhook(evt.data)
      if (profile) await syncClerkUser(profile)
    } else if (evt.type === "user.deleted" && evt.data.id) {
      await suspendClerkUser(evt.data.id)
    }
    return new Response("OK", { status: 200 })
  } catch (err) {
    console.error(`Clerk webhook: ${evt.type} failed for ${evt.data.id}`, err)
    return new Response("Webhook handler error", { status: 500 })
  }
}
