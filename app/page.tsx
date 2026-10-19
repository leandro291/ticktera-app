import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";
import { HomePage, pickFeatured } from "@/modules/event";
import { listUpcomingEvents } from "@/modules/event/server";

export default async function Home() {
  const upcoming = await listUpcomingEvents();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <HomePage featured={pickFeatured(upcoming)} upcoming={upcoming} />
      </main>
      <SiteFooter />
    </>
  );
}
