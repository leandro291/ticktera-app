import { randomUUID } from "node:crypto";
import { and, count, eq, inArray, like, or } from "drizzle-orm";
import { db } from "@/db";
import { categories, events, ticketTypes } from "@/db/schema";
import { isUniqueViolation, pgConstraint } from "@/lib/db-errors";
import { EVENT_LIMITS } from "../lib/event-limits";
import { checkFrozenEdit, type CurrentTier } from "../lib/event-freeze";
import { checkPublishable } from "../lib/event-publish";
import { slugBase, uniqueSlug } from "../lib/event-slug";
import { freezeIssuesToFieldErrors, publishIssuesToFieldErrors } from "../lib/field-errors";
import { limaDateTimeToDate } from "../lib/lima-datetime";
import type { EventDbStatus } from "../types/event-list";
import type { SaveEventInput, TierInput } from "../types/event-write";
import { logEventAudit } from "./event-audit";
import { EventError } from "./event-error";
import { lockAndLoadTiers, type Tx } from "./event-sales";

type Actor = { id: string };
type SaveResult = { id: string; status: EventDbStatus; updatedAt: string };

const SWAPPED_NAME = "Otro tipo de entrada todavía usa este nombre. Guarda el cambio en dos pasos.";

const randomSuffix = () => randomUUID().slice(0, 5);

/** D16: slug libre a partir del título; el índice único es la última barrera (slug-conflict). */
async function freeSlug(tx: Tx, title: string): Promise<string> {
  const base = slugBase(title);
  const rows = await tx
    .select({ slug: events.slug })
    .from(events)
    .where(or(eq(events.slug, base), like(events.slug, `${base}-%`))); // slugify no deja % ni _
  return uniqueSlug(base, new Set(rows.map((r) => r.slug)), randomSuffix);
}

async function assertCategory(tx: Tx, categoryId: string): Promise<void> {
  const [category] = await tx.select({ id: categories.id }).from(categories).where(eq(categories.id, categoryId)).limit(1);
  if (!category) throw new EventError("invalid-category", { categoryId: "Elige una categoría válida." });
}

function assertPublishable(input: SaveEventInput, startsAt: Date, now: Date, checkDate: boolean): void {
  const issues = checkPublishable({ ...input, startsAt }, now, { checkDate });
  if (issues.length) throw new EventError("not-publishable", publishIssuesToFieldErrors(issues));
}

const tierValues = (t: TierInput, sortOrder: number) => ({
  name: t.name,
  priceCents: t.priceCents,
  capacity: t.capacity,
  maxPerOrder: t.maxPerOrder,
  sortOrder,
});

/**
 * ponytail: intercambiar nombres entre dos tipos en un mismo guardado chocaría con el único (event_id, name) a mitad
 * de la sincronización; se detecta antes de escribir y se pide hacerlo en dos pasos.
 */
function swappedNameErrors(current: CurrentTier[], tiers: TierInput[]): Record<string, string> {
  const keptIds = new Set(tiers.map((t) => t.id));
  const errors: Record<string, string> = {};
  tiers.forEach((t, i) => {
    const before = current.find((c) => c.id === t.id);
    if (!before || before.name === t.name) return;
    if (current.some((c) => c.id !== t.id && keptIds.has(c.id) && c.name === t.name)) errors[`tiers.${i}.name`] = SWAPPED_NAME;
  });
  return errors;
}

async function createEvent(tx: Tx, actor: Actor, input: SaveEventInput, startsAt: Date, now: Date): Promise<SaveResult> {
  // D18: tope anti-abuso contado al crear, sin lock.
  const [{ total }] = await tx.select({ total: count() }).from(events).where(eq(events.organizerId, actor.id));
  if (total >= EVENT_LIMITS.maxEventsPerOrganizer) throw new EventError("limit-reached");
  await assertCategory(tx, input.categoryId);
  if (input.publish) assertPublishable(input, startsAt, now, true);

  const status: EventDbStatus = input.publish ? "published" : "draft";
  const [row] = await tx
    .insert(events)
    .values({
      organizerId: actor.id,
      categoryId: input.categoryId,
      slug: await freeSlug(tx, input.title),
      title: input.title,
      description: input.description || null,
      startsAt,
      venueName: input.venueName,
      address: input.address || null,
      city: input.city,
      status,
      publishedAt: input.publish ? now : null,
    })
    .returning({ id: events.id, updatedAt: events.updatedAt });
  if (input.tiers.length) await tx.insert(ticketTypes).values(input.tiers.map((t, i) => ({ eventId: row.id, ...tierValues(t, i) })));

  logEventAudit({ action: "create", eventId: row.id, actorId: actor.id, to: status });
  return { id: row.id, status, updatedAt: row.updatedAt.toISOString() };
}

async function updateEvent(tx: Tx, actor: Actor, input: SaveEventInput & { id: string }, startsAt: Date, now: Date): Promise<SaveResult> {
  // Propiedad dentro del SQL que bloquea: ajeno o inexistente dan el mismo not-found (AC4).
  const [current] = await tx
    .select()
    .from(events)
    .where(and(eq(events.id, input.id), eq(events.organizerId, actor.id)))
    .for("update");
  if (!current) throw new EventError("not-found");
  if (current.status !== "draft" && current.status !== "published") throw new EventError("not-editable");
  // D8: el pg driver y getEventForEdit truncan igual a milisegundos; con la fila bloqueada no hay carrera.
  if (current.updatedAt.getTime() !== new Date(input.expectedUpdatedAt ?? "").getTime()) throw new EventError("stale");

  const tiers = await lockAndLoadTiers(tx, current.id);
  await assertCategory(tx, input.categoryId);

  // AC5/AC15/AC16: ids de tipos revalidados siempre; congelamiento si hay ventas.
  const place = { startsAt, venueName: input.venueName, address: input.address, city: input.city };
  const before = { startsAt: current.startsAt, venueName: current.venueName, address: current.address ?? "", city: current.city };
  const issues = checkFrozenEdit({ place: before, tiers }, { place, tiers: input.tiers }, false);
  const needsAck = issues.some((i) => i.code === "buyer-impact-unacknowledged");
  const blocking = input.acknowledgeBuyerImpact ? issues.filter((i) => i.code !== "buyer-impact-unacknowledged") : issues;
  if (blocking.length) throw new EventError("frozen", freezeIssuesToFieldErrors(blocking, input.tiers));
  const swapped = swappedNameErrors(tiers, input.tiers);
  if (Object.keys(swapped).length) throw new EventError("frozen", swapped);

  // D3/D4: un published sigue cumpliendo las reglas de publicación; la fecha solo se revalida si cambió.
  const publishing = current.status === "draft" && input.publish;
  if (publishing) assertPublishable(input, startsAt, now, true);
  else if (current.status === "published") assertPublishable(input, startsAt, now, startsAt.getTime() !== current.startsAt.getTime());

  // D16: el slug sigue al título solo mientras nunca se publicó.
  const slug =
    current.status === "draft" && current.publishedAt === null && slugBase(input.title) !== slugBase(current.title)
      ? await freeSlug(tx, input.title)
      : current.slug;
  const status: EventDbStatus = publishing ? "published" : current.status;

  const [row] = await tx
    .update(events)
    .set({
      categoryId: input.categoryId,
      slug,
      title: input.title,
      description: input.description || null,
      startsAt,
      venueName: input.venueName,
      address: input.address || null,
      city: input.city,
      status,
      ...(publishing && { publishedAt: now }),
    })
    .where(eq(events.id, current.id))
    .returning({ updatedAt: events.updatedAt });

  // Sincroniza tipos: borrar → actualizar → insertar. checkFrozenEdit ya garantizó que lo borrado no tiene órdenes.
  const keptIds = input.tiers.flatMap((t) => (t.id ? [t.id] : []));
  const removed = tiers.filter((t) => !keptIds.includes(t.id)).map((t) => t.id);
  if (removed.length) await tx.delete(ticketTypes).where(and(eq(ticketTypes.eventId, current.id), inArray(ticketTypes.id, removed)));
  for (const [i, t] of input.tiers.entries()) {
    if (t.id) await tx.update(ticketTypes).set(tierValues(t, i)).where(and(eq(ticketTypes.id, t.id), eq(ticketTypes.eventId, current.id)));
  }
  const added = input.tiers.flatMap((t, i) => (t.id ? [] : [{ eventId: current.id, ...tierValues(t, i) }]));
  if (added.length) await tx.insert(ticketTypes).values(added);

  logEventAudit({
    action: publishing ? "update-publish" : "update",
    eventId: current.id,
    actorId: actor.id,
    from: current.status,
    to: status,
    ...(needsAck && { ack: true }),
  });
  return { id: current.id, status, updatedAt: row.updatedAt.toISOString() };
}

/** Crea (sin id) o edita (con id) un evento propio en una transacción: todo o nada (AC12, AC14). */
export async function saveEvent(actor: Actor, input: SaveEventInput, now = new Date()): Promise<SaveResult> {
  const startsAt = limaDateTimeToDate(input.date, input.startTime);
  if (!startsAt) throw new EventError("not-publishable", { date: "Fecha inválida." }); // el schema ya lo descarta
  try {
    return await db.transaction((tx) =>
      input.id ? updateEvent(tx, actor, { ...input, id: input.id }, startsAt, now) : createEvent(tx, actor, input, startsAt, now),
    );
  } catch (error) {
    if (isUniqueViolation(error) && pgConstraint(error) === "events_slug_unique") throw new EventError("slug-conflict");
    if (isUniqueViolation(error) && pgConstraint(error) === "ticket_types_event_id_name_unique") {
      throw new EventError("frozen", { tiers: SWAPPED_NAME });
    }
    throw error;
  }
}
