import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";
import { HomePage, pickFeatured } from "@/modules/event";
import { listUpcomingEvents } from "@/modules/event/server";

// Lee la BD y depende de la fecha actual: sin esto `next build` la prerenderiza y queda congelada (y exige BD en el build).
export const dynamic = "force-dynamic";

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
