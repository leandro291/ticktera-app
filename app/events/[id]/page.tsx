import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";
import { EventDetailView, getEventById, getRelatedEvents } from "@/modules/event";
import { getEventVenue, ZonePriceList } from "@/modules/purchase";

export async function generateMetadata({ params }: PageProps<"/events/[id]">): Promise<Metadata> {
  const event = await getEventById((await params).id);
  return { title: event?.title ?? "Evento no encontrado" };
}

export default async function EventPage({ params }: PageProps<"/events/[id]">) {
  const event = await getEventById((await params).id);
  if (!event) notFound();
  const [related, venue] = await Promise.all([getRelatedEvents(event), getEventVenue(event)]);

  return (
    <>
      <SiteHeader className="hidden lg:block" />
      <main className="flex-1">
        <EventDetailView event={event} related={related} tiers={<ZonePriceList tiers={venue.tiers} currency={venue.currency} />} />
      </main>
      <SiteFooter />
    </>
  );
}
