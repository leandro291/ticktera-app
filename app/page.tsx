import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";
import { getEvents, getFeaturedEvents, HomePage } from "@/modules/event";

export default async function Home() {
  const [featured, upcoming] = await Promise.all([getFeaturedEvents(), getEvents()]);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <HomePage featured={featured} upcoming={upcoming} />
      </main>
      <SiteFooter />
    </>
  );
}
