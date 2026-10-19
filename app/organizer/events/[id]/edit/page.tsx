import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { requirePagePermission } from "@/modules/auth/server";
import { getEventForEdit, listCategories } from "@/modules/event/server";
import { EventForm } from "@/modules/organizer";

export const metadata: Metadata = { title: "Editar evento" };

export default async function EditEventPage({ params, searchParams }: PageProps<"/organizer/events/[id]/edit">) {
  const user = await requirePagePermission("events:manage-own");
  const { id } = await params;
  // Ajeno, inexistente o id inválido: el mismo 404 (AC23).
  if (!z.uuid().safeParse(id).success) notFound();
  const [event, categories] = await Promise.all([getEventForEdit(user.id, id), listCategories()]);
  if (!event) notFound();
  if (event.status === "cancelled" || event.status === "suspended") redirect("/organizer");

  const { cover } = await searchParams;
  // `key`: tras guardar y volver, el formulario arranca de los datos frescos.
  return <EventForm key={event.updatedAt} categories={categories} initial={event} coverFailed={cover === "failed"} />;
}
