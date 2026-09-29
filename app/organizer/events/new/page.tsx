import type { Metadata } from "next";
import { EventForm } from "@/modules/organizer";

export const metadata: Metadata = { title: "Crear evento" };

export default async function NewEventPage({ searchParams }: PageProps<"/organizer/events/new">) {
  const { draft } = await searchParams;
  const draftId = typeof draft === "string" ? draft : undefined;
  // `key` remounts the form when switching between a draft and a blank event.
  return <EventForm key={draftId ?? "new"} draftId={draftId} />;
}
