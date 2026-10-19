import type { Metadata } from "next";
import { requirePagePermission } from "@/modules/auth/server";
import { listCategories } from "@/modules/event/server";
import { EventForm } from "@/modules/organizer";

export const metadata: Metadata = { title: "Crear evento" };

export default async function NewEventPage() {
  await requirePagePermission("events:manage-own");
  return <EventForm categories={await listCategories()} />;
}
