import type { Metadata } from "next";
import { MyTickets } from "@/modules/account";
import { requirePagePermission } from "@/modules/auth/server";
import { isoToLimaDate } from "@/modules/event";
import { listMyOrders } from "@/modules/purchase/server";

export const metadata: Metadata = { title: "Mis entradas" };

// Dinámica por la sesión (Clerk lee headers/cookies): nunca se prerenderiza ni se comparte entre usuarios.
export default async function MyTicketsPage() {
  const user = await requirePagePermission("checkout:buy");
  const orders = await listMyOrders(user.id);
  // "Hoy" en Lima, calculado en el servidor (no la fecha del navegador).
  const today = isoToLimaDate(new Date().toISOString());

  return <MyTickets orders={orders} today={today} />;
}
