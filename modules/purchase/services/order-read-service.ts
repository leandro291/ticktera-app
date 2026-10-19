import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, events, orderItems, orders, ticketTypes, users } from "@/db/schema";
import { toOrder, type OrderStatus } from "../lib/order-mapper";
import type { Order } from "../types/order";

/**
 * D13/AC12: la orden por código, solo si es de `userId` (la propiedad se filtra en el SQL: la ajena es indistinguible
 * de la inexistente y da null). Los ítems salen en el orden de las zonas del evento.
 */
export async function getOrderByCode(code: string, userId: string): Promise<{ status: OrderStatus; order: Order } | null> {
  const rows = await db
    .select({
      code: orders.code,
      status: orders.status,
      totalCents: orders.totalCents,
      slug: events.slug,
      title: events.title,
      categoryName: categories.name,
      coverImageUrl: events.coverImageUrl,
      startsAt: events.startsAt,
      venueName: events.venueName,
      city: events.city,
      zoneName: ticketTypes.name,
      quantity: orderItems.quantity,
      unitPriceCents: orderItems.unitPriceCents,
      fullName: users.fullName,
      email: users.email,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .innerJoin(ticketTypes, eq(ticketTypes.id, orderItems.ticketTypeId))
    .innerJoin(events, eq(events.id, ticketTypes.eventId))
    .innerJoin(categories, eq(categories.id, events.categoryId))
    .where(and(eq(orders.code, code), eq(orders.userId, userId)))
    .orderBy(asc(ticketTypes.sortOrder), asc(ticketTypes.id));

  const [first] = rows;
  if (!first) return null;
  return {
    status: first.status,
    order: toOrder({
      order: { code: first.code, status: first.status, totalCents: first.totalCents },
      event: first,
      items: rows,
      buyer: { fullName: first.fullName, email: first.email },
    }),
  };
}
