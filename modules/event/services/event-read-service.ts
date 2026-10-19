import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, events } from "@/db/schema";
import { committed } from "../lib/event-freeze";
import { isoToLimaDate, isoToLimaTime } from "../lib/format";
import type { EventEditData } from "../types/event-write";
import { loadTiers } from "./event-sales";

/** D7: datos para editar un evento propio. null si no existe o no es del actor (la página responde 404 igual). */
export async function getEventForEdit(actorId: string, id: string): Promise<EventEditData | null> {
  // Una transacción de lectura: evento y ventas salen del mismo snapshot.
  return db.transaction(async (tx) => {
    const [event] = await tx
      .select()
      .from(events)
      .where(and(eq(events.id, id), eq(events.organizerId, actorId)))
      .limit(1);
    if (!event) return null;
    const tiers = await loadTiers(tx, event.id);
    const startsAt = event.startsAt.toISOString();
    return {
      id: event.id,
      status: event.status,
      updatedAt: event.updatedAt.toISOString(),
      title: event.title,
      categoryId: event.categoryId,
      description: event.description ?? "",
      coverImageUrl: event.coverImageUrl,
      date: isoToLimaDate(startsAt),
      startTime: isoToLimaTime(startsAt),
      venueName: event.venueName,
      address: event.address ?? "",
      city: event.city,
      hasSales: tiers.some((t) => committed(t) > 0),
      tiers: tiers.map((t) => ({
        id: t.id,
        name: t.name,
        priceCents: t.priceCents,
        capacity: t.capacity,
        maxPerOrder: t.maxPerOrder,
        sold: t.paid,
        reserved: t.reserved,
        hasOrders: t.orderItems > 0,
      })),
    };
  });
}

/** D20: categorías de la BD para el formulario, en su orden. */
export async function listCategories(): Promise<{ id: string; name: string }[]> {
  return db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.sortOrder));
}
