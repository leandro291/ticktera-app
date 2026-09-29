import type { Metadata } from "next";
import { SiteFooter } from "@/components/shared/site-footer";
import { SiteHeader } from "@/components/shared/site-header";
import { MyTickets } from "@/modules/account";

export const metadata: Metadata = { title: "Mis entradas" };

export default function MyTicketsPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 bg-canvas">
        <MyTickets />
      </main>
      <SiteFooter />
    </>
  );
}
