import type { Metadata } from "next";
import { getEventById } from "@/modules/event";
import { CheckoutView, getEventVenue, PurchaseHeader } from "@/modules/purchase";

export const metadata: Metadata = { title: "Datos y pago" };

export default async function CheckoutPage({ searchParams }: PageProps<"/checkout">) {
  const { event: eventId } = await searchParams;
  const event = typeof eventId === "string" ? await getEventById(eventId) : null;
  const venue = event ? await getEventVenue(event) : null;

  return (
    <>
      <PurchaseHeader
        step={2}
        title="Datos y pago"
        backHref={event ? `/events/${event.id}/tickets` : "/events"}
        backLabel="Volver a entradas"
      />
      <main className="flex-1 bg-canvas">
        <CheckoutView event={event} venue={venue} />
      </main>
    </>
  );
}
