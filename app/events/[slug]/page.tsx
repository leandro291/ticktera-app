import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";
import { EventDetailView, pickRelated } from "@/modules/event";
import { listUpcomingEvents } from "@/modules/event/server";
import { ZonePriceList } from "@/modules/purchase";
import { getEventZones } from "@/modules/purchase/server";

export async function generateMetadata({ params }: PageProps<"/events/[slug]">): Promise<Metadata> {
  const found = await getEventZones((await params).slug);
  return { title: found?.event.title ?? "Evento no encontrado" };
}

export default async function EventPage({ params }: PageProps<"/events/[slug]">) {
  const { slug } = await params;
  const [found, upcoming] = await Promise.all([getEventZones(slug), listUpcomingEvents()]);
  if (!found) notFound();
  const { event, venue } = found;

  return (
    <>
      <SiteHeader className="hidden lg:block" />
      <main className="flex-1">
        <EventDetailView
          event={event}
          related={pickRelated(event, upcoming)}
          tiers={<ZonePriceList tiers={venue.tiers} currency={venue.currency} />}
        />
      </main>
      <SiteFooter />
    </>
  );
}
