import type { Metadata } from "next";
import { CheckoutView, PurchaseHeader } from "@/modules/purchase";
import { getEventZones } from "@/modules/purchase/server";

export const metadata: Metadata = { title: "Datos y pago" };

export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  const { event: slug } = await searchParams;
  const found = typeof slug === "string" ? await getEventZones(slug) : null;

  return (
    <>
      <PurchaseHeader
        step={2}
        title="Datos y pago"
        backHref={found ? `/events/${found.event.id}/tickets` : "/events"}
        backLabel="Volver a entradas"
      />
      <main className="flex-1 bg-canvas">
        <CheckoutView event={found?.event ?? null} venue={found?.venue ?? null} />
      </main>
    </>
  );
}
