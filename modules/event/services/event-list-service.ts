import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, events, orderItems, orders, ticketTypes } from "@/db/schema";
import { buildEventList, type EventListRow } from "../lib/event-list";
import type { EventListResponse } from "../types/event-list";

export type EventListQuery =
  | { scope: "published" }
  | { scope: "all" }
  | { scope: "mine"; organizerId: string }; // organizerId SOLO lo pasa el route handler desde requirePermission

// Columnas compartidas por todos los alcances (sin organizerId ni datos de usuario).
const baseColumns = {
  id: events.id,
  slug: events.slug,
  title: events.title,
  categoryName: categories.name,
  coverImageUrl: events.coverImageUrl,
  startsAt: events.startsAt,
  venueName: events.venueName,
  city: events.city,
  status: events.status,
  tierId: ticketTypes.id,
  tierName: ticketTypes.name,
  tierPriceCents: ticketTypes.priceCents,
  tierCapacity: ticketTypes.capacity,
  tierSortOrder: ticketTypes.sortOrder,
};

export async function listEvents(query: { scope: "published" }): Promise<EventListResponse<"published">>;
export async function listEvents(
  query: { scope: "all" } | { scope: "mine"; organizerId: string },
): Promise<EventListResponse<"mine">>;
export async function listEvents(
  query: EventListQuery,
): Promise<EventListResponse<"published"> | EventListResponse<"mine">> {
  const order = [desc(events.startsAt), asc(events.id), asc(ticketTypes.sortOrder)] as const;

  if (query.scope === "published") {
    // Público: no une order_items ni orders, no calcula ventas.
    const rows: EventListRow[] = await db
      .select(baseColumns)
      .from(events)
      .innerJoin(categories, eq(events.categoryId, categories.id))
      .leftJoin(ticketTypes, eq(ticketTypes.eventId, events.id))
      .where(eq(events.status, "published"))
      .orderBy(...order);
    return { items: buildEventList(rows, { includeSales: false }) };
  }

  // `mine` filtra por el usuario de la sesión (nunca un id del cliente); `all` no filtra por organizador.
  const where = query.scope === "mine" ? eq(events.organizerId, query.organizerId) : undefined;

  // Solo órdenes `paid` suman. sum(int) ya es bigint; el producto se castea a bigint antes de multiplicar
  // (int4 * int4 desborda desde ~21 M de soles). pg devuelve bigint como string: lo parsea buildEventList.
  const paid = sql`${orders.status} = 'paid'`;
  const rows: EventListRow[] = await db
    .select({
      ...baseColumns,
      tierSold: sql<string>`coalesce(sum(${orderItems.quantity}) filter (where ${paid}), 0)::bigint`,
      tierRevenueCents: sql<string>`coalesce(sum(${orderItems.quantity}::bigint * ${orderItems.unitPriceCents}) filter (where ${paid}), 0)::bigint`,
    })
    .from(events)
    .innerJoin(categories, eq(events.categoryId, categories.id))
    .leftJoin(ticketTypes, eq(ticketTypes.eventId, events.id))
    .leftJoin(orderItems, eq(orderItems.ticketTypeId, ticketTypes.id))
    .leftJoin(orders, eq(orders.id, orderItems.orderId))
    .where(where)
    .groupBy(events.id, categories.id, ticketTypes.id)
    .orderBy(...order);
  // ponytail: agrega en cada request sobre todas las órdenes de los eventos del alcance, sin paginar. Techo ~500 eventos por alcance y ~100k order_items por organizador; después paginar en servidor y mover KPIs a una consulta aparte o a contadores.
  return { items: buildEventList(rows, { includeSales: true }) };
}
