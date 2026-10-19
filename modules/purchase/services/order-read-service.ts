import { and, asc, desc, eq, inArray, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { categories, events, orderItems, orders, tickets, ticketTypes, users } from "@/db/schema";
import { groupOrderRows, type OrderStatus } from "../lib/order-mapper";
import type { Order } from "../types/order";

/** D3: las órdenes que "Mis entradas" lista. `pending` y `expired` nunca son entradas. */
export const MY_TICKETS_STATUSES = ["paid", "refunded"] as const;

/**
 * D2: una sola consulta (orden × ítem × ticket) para `getOrderByCode` y `listMyOrders`. El filtro de dueño lo arma esta
 * función con el `userId` de la sesión: ningún llamador puede omitirlo. Orden: compra más reciente primero; ítems por zona;
 * tickets por código.
 */
async function selectOrderRows(userId: string, filter: SQL) {
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
      itemId: orderItems.id,
      zoneName: ticketTypes.name,
      quantity: orderItems.quantity,
      unitPriceCents: orderItems.unitPriceCents,
      ticketCode: tickets.code,
      ticketStatus: tickets.status,
      holderName: tickets.holderName,
      fullName: users.fullName,
      email: users.email,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .innerJoin(ticketTypes, eq(ticketTypes.id, orderItems.ticketTypeId))
    .innerJoin(events, eq(events.id, ticketTypes.eventId))
    .innerJoin(categories, eq(categories.id, events.categoryId))
    .leftJoin(tickets, eq(tickets.orderItemId, orderItems.id))
    .where(and(eq(orders.userId, userId), filter))
    .orderBy(desc(orders.createdAt), asc(orders.id), asc(ticketTypes.sortOrder), asc(ticketTypes.id), asc(tickets.code));
  return groupOrderRows(rows);
}

/**
 * D13/AC12: la orden por código, solo si es de `userId` (la propiedad se filtra en el SQL: la ajena es indistinguible
 * de la inexistente y da null). Incluye los tickets emitidos.
 */
export async function getOrderByCode(code: string, userId: string): Promise<{ status: OrderStatus; order: Order } | null> {
  const [found] = await selectOrderRows(userId, eq(orders.code, code));
  return found ?? null;
}

/**
 * AC1: las órdenes de `userId` en `MY_TICKETS_STATUSES`, la compra más reciente primero; se omiten las sin tickets.
 * El dueño se filtra en el SQL.
 */
export async function listMyOrders(userId: string): Promise<Order[]> {
  // ponytail: sin límite ni paginación; paginar o partir en dos consultas si alguien supera ~100 órdenes (D5).
  const found = await selectOrderRows(userId, inArray(orders.status, [...MY_TICKETS_STATUSES]));
  return found.map(({ order }) => order).filter((order) => order.tickets.length > 0);
}
