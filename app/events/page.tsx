import type { Metadata } from "next";
import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";
import { EventSearch, parseEventSearchParams } from "@/modules/event";
import { listUpcomingEvents } from "@/modules/event/server";

export const metadata: Metadata = { title: "Explora eventos" };

export default async function EventsPage({ searchParams }: PageProps<"/events">) {
  const { query, filters } = parseEventSearchParams(await searchParams);
  const events = await listUpcomingEvents();

  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-canvas">
        <EventSearch events={events} initialQuery={query} initialFilters={filters} />
      </main>
      <SiteFooter />
    </>
  );
}
