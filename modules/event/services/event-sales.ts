import { asc, eq, sql } from "drizzle-orm";
import type { db } from "@/db";
import { orderItems, orders, ticketTypes } from "@/db/schema";
import type { CurrentTier } from "../lib/event-freeze";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Tipos del evento con lo vendido (paid), lo reservado vigente (pending sin vencer) y cuántos order_items tienen. */
export async function loadTiers(tx: Tx, eventId: string): Promise<CurrentTier[]> {
  const paid = sql`${orders.status} = 'paid'`;
  const reserved = sql`${orders.status} = 'pending' and ${orders.expiresAt} > now()`;
  // ::int: los conteos por tipo están acotados por la capacidad (≤ 100 000), no hace falta bigint.
  return tx
    .select({
      id: ticketTypes.id,
      name: ticketTypes.name,
      priceCents: ticketTypes.priceCents,
      capacity: ticketTypes.capacity,
      maxPerOrder: ticketTypes.maxPerOrder,
      paid: sql<number>`coalesce(sum(${orderItems.quantity}) filter (where ${paid}), 0)::int`,
      reserved: sql<number>`coalesce(sum(${orderItems.quantity}) filter (where ${reserved}), 0)::int`,
      orderItems: sql<number>`count(${orderItems.id})::int`,
    })
    .from(ticketTypes)
    .leftJoin(orderItems, eq(orderItems.ticketTypeId, ticketTypes.id))
    .leftJoin(orders, eq(orders.id, orderItems.orderId))
    .where(eq(ticketTypes.eventId, eventId))
    .groupBy(ticketTypes.id)
    .orderBy(asc(ticketTypes.sortOrder));
}

/**
 * D9: bloquea los ticket_types del evento (el mismo lock que toma "crear orden") y recién después lee las ventas,
 * así una orden concurrente espera nuestro commit. Postgres no admite FOR UPDATE con GROUP BY: primero el lock, luego el agregado.
 */
export async function lockAndLoadTiers(tx: Tx, eventId: string): Promise<CurrentTier[]> {
  // Orden por id: el checkout debe bloquear en el mismo orden para no generar deadlocks.
  await tx.select({ id: ticketTypes.id }).from(ticketTypes).where(eq(ticketTypes.eventId, eventId)).orderBy(asc(ticketTypes.id)).for("update");
  return loadTiers(tx, eventId);
}
