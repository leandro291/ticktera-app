import { and, asc, eq, gt, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { categories, events, orderItems, orders, ticketTypes } from "@/db/schema";
import { toPublicEvents, type CatalogRow, type PublicTier } from "../lib/catalog-mapper";
import type { EventDetail } from "../types/event";

/**
 * Catalog D2/D12: eventos `published` y futuros con sus zonas y cupo, en una consulta. Solo agregados de cantidades:
 * nunca organizer_id ni datos de compradores.
 * ponytail: lee todo el catálogo en cada request (filtros en el cliente). Techo ~500 eventos; después paginar en servidor.
 */
async function queryPublic(now: Date, extra?: SQL): Promise<CatalogRow[]> {
  const paid = sql`${orders.status} = 'paid'`;
  const reserved = sql`${orders.status} = 'pending' and ${orders.expiresAt} > now()`;
  return db
    .select({
      slug: events.slug,
      title: events.title,
      categoryName: categories.name,
      coverImageUrl: events.coverImageUrl,
      startsAt: events.startsAt,
      venueName: events.venueName,
      address: events.address,
      city: events.city,
      description: events.description,
      tierId: ticketTypes.id,
      tierName: ticketTypes.name,
      tierPriceCents: ticketTypes.priceCents,
      tierCapacity: ticketTypes.capacity,
      tierMaxPerOrder: ticketTypes.maxPerOrder,
      // ::int: acotado por la capacidad de la zona.
      tierPaid: sql<number>`coalesce(sum(${orderItems.quantity}) filter (where ${paid}), 0)::int`,
      tierReserved: sql<number>`coalesce(sum(${orderItems.quantity}) filter (where ${reserved}), 0)::int`,
    })
    .from(events)
    .innerJoin(categories, eq(events.categoryId, categories.id))
    .leftJoin(ticketTypes, eq(ticketTypes.eventId, events.id))
    .leftJoin(orderItems, eq(orderItems.ticketTypeId, ticketTypes.id))
    .leftJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(eq(events.status, "published"), gt(events.startsAt, now), extra))
    .groupBy(events.id, categories.id, ticketTypes.id)
    .orderBy(asc(events.startsAt), asc(events.id), asc(ticketTypes.sortOrder));
}

/** Próximos eventos públicos, por fecha. */
export async function listUpcomingEvents(now = new Date()): Promise<EventDetail[]> {
  return toPublicEvents(await queryPublic(now)).map((e) => e.event);
}

/** Un evento público con sus zonas; null si no existe, no está publicado o ya pasó (D2). */
export async function getPublicEvent(slug: string, now = new Date()): Promise<{ event: EventDetail; tiers: PublicTier[] } | null> {
  return toPublicEvents(await queryPublic(now, eq(events.slug, slug)))[0] ?? null;
}
