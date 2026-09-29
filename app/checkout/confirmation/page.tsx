import type { Metadata } from "next";
import { PurchaseConfirmation, PurchaseHeader } from "@/modules/purchase";

export const metadata: Metadata = { title: "Compra confirmada" };

export default function ConfirmationPage() {
  return (
    <>
      <PurchaseHeader step={3} title="Compra confirmada" />
      <main className="flex-1 bg-canvas">
        <PurchaseConfirmation />
      </main>
    </>
  );
}
