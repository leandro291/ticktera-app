import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getEventById } from "@/modules/event";
import { getEventVenue, PurchaseHeader, TicketSelection } from "@/modules/purchase";

export async function generateMetadata({ params }: PageProps<"/events/[id]/tickets">): Promise<Metadata> {
  const event = await getEventById((await params).id);
  return { title: event ? `Entradas · ${event.title}` : "Evento no encontrado" };
}

export default async function TicketsPage({ params }: PageProps<"/events/[id]/tickets">) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();
  if (event.status === "sold-out") redirect(`/events/${id}`);
  const venue = await getEventVenue(event);

  return (
    <>
      <PurchaseHeader step={1} title="Elige tus entradas" backHref={`/events/${id}`} backLabel="Volver al evento" />
      <main className="flex-1 bg-canvas">
        <TicketSelection event={event} venue={venue} />
      </main>
    </>
  );
}
