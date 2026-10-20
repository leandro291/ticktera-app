import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";

export default function MyTicketsLayout({ children }: LayoutProps<"/my-tickets">) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-canvas">{children}</main>
      <SiteFooter />
    </>
  );
}
