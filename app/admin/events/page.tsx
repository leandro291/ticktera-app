import type { Metadata } from "next"
import { requirePagePermission } from "@/modules/auth/server"
import { ModerationEventsPage } from "@/modules/event"

export const metadata: Metadata = { title: "Moderar eventos" }

export default async function AdminEventsPage() {
  await requirePagePermission("events:moderate")
  return <ModerationEventsPage />
}
