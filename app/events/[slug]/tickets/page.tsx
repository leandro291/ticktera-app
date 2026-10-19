import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PurchaseHeader, TicketSelection } from "@/modules/purchase";
import { getEventZones } from "@/modules/purchase/server";

export async function generateMetadata({ params }: PageProps<"/events/[slug]/tickets">): Promise<Metadata> {
  const found = await getEventZones((await params).slug);
  return { title: found ? `Entradas · ${found.event.title}` : "Evento no encontrado" };
}

export default async function TicketsPage({ params }: PageProps<"/events/[slug]/tickets">) {
  const { slug } = await params;
  const found = await getEventZones(slug);
  if (!found) notFound();
  if (found.event.status === "sold-out") redirect(`/events/${slug}`);

  return (
    <>
      <PurchaseHeader step={1} title="Elige tus entradas" backHref={`/events/${slug}`} backLabel="Volver al evento" />
      <main className="flex-1 bg-canvas">
        <TicketSelection event={found.event} venue={found.venue} />
      </main>
    </>
  );
}
