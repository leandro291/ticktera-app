import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePagePermission } from "@/modules/auth/server";
import { PurchaseConfirmation, PurchaseHeader } from "@/modules/purchase";
import { getOrderByCode } from "@/modules/purchase/server";

export const metadata: Metadata = { title: "Tu compra" };

export default async function ConfirmationPage({ searchParams }: PageProps<"/checkout/confirmation">) {
  const user = await requirePagePermission("checkout:buy");
  const { code } = await searchParams;
  // Ajena, inexistente o ausente: el mismo 404 (AC12).
  const found = typeof code === "string" ? await getOrderByCode(code.trim().toUpperCase(), user.id) : null;
  if (!found) notFound();

  return (
    <>
      <PurchaseHeader step={3} title={found.status === "paid" ? "Compra confirmada" : "Tu compra"} />
      <main className="flex-1 bg-canvas">
        <PurchaseConfirmation status={found.status} order={found.order} />
      </main>
    </>
  );
}
