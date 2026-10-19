import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { events } from "@/db/schema";
import { isForeignKeyViolation } from "@/lib/db-errors";
import { committed } from "../lib/event-freeze";
import { checkPublishable } from "../lib/event-publish";
import { allowedActions, nextStatus } from "../lib/event-transitions";
import { publishIssuesToFieldErrors } from "../lib/field-errors";
import type { EventDbStatus } from "../types/event-list";
import type { ModerationAction, TransitionAction } from "../types/event-write";
import { logEventAudit } from "./event-audit";
import { deleteCoverBlob } from "./event-cover-service";
import { EventError } from "./event-error";
import { lockAndLoadTiers } from "./event-sales";

type Actor = { id: string };

/** Dueño: publicar, despublicar o cancelar lo ya guardado. Compare-and-set sobre `status` bajo lock de fila (AC8). */
export async function transitionEvent(
  actor: Actor,
  i: { id: string; action: TransitionAction },
  now = new Date(),
): Promise<{ status: EventDbStatus; title: string }> {
  return db.transaction(async (tx) => {
    const [event] = await tx
      .select()
      .from(events)
      .where(and(eq(events.id, i.id), eq(events.organizerId, actor.id)))
      .for("update");
    if (!event) throw new EventError("not-found");
    if (!allowedActions(event.status, { owner: true, moderator: false }).includes(i.action)) throw new EventError("invalid-transition");

    const tiers = await lockAndLoadTiers(tx, event.id);
    if (i.action === "unpublish" && tiers.some((t) => committed(t) > 0)) throw new EventError("has-sales");
    if (i.action === "publish") {
      const issues = checkPublishable({ ...event, tiers }, now, { checkDate: true });
      if (issues.length) throw new EventError("not-publishable", publishIssuesToFieldErrors(issues));
    }

    const to = nextStatus(i.action);
    // Despublicar conserva published_at: el slug ya es público y no cambia (AC8, D16).
    await tx
      .update(events)
      .set({ status: to, ...(i.action === "publish" && { publishedAt: now }) })
      .where(eq(events.id, event.id));
    logEventAudit({ action: i.action, eventId: event.id, actorId: actor.id, from: event.status, to });
    return { status: to, title: event.title };
  });
}

/** Moderador (U1): suspender, reactivar o cancelar eventos de cualquiera. Solo cambia `status`. */
export async function moderateEvent(
  actor: Actor,
  i: { id: string; action: ModerationAction },
): Promise<{ status: EventDbStatus; title: string }> {
  return db.transaction(async (tx) => {
    const [event] = await tx
      .select({ id: events.id, status: events.status, title: events.title })
      .from(events)
      .where(eq(events.id, i.id))
      .for("update");
    if (!event) throw new EventError("not-found");
    if (!allowedActions(event.status, { owner: false, moderator: true }).includes(i.action)) throw new EventError("invalid-transition");

    const to = nextStatus(i.action);
    await tx.update(events).set({ status: to }).where(eq(events.id, event.id));
    logEventAudit({ action: i.action, eventId: event.id, actorId: actor.id, from: event.status, to });
    return { status: to, title: event.title };
  });
}

/**
 * U3/AC18: DELETE real solo sin órdenes. La FK order_items → ticket_types (sin cascade) es el chequeo: 23503 → has-orders.
 * Sin "contar y luego borrar". La portada de Blob se borra después del commit, best-effort.
 */
export async function deleteEvent(actor: Actor, i: { id: string }): Promise<{ title: string }> {
  let deleted: { title: string; coverImageUrl: string | null };
  try {
    deleted = await db.transaction(async (tx) => {
      const [event] = await tx
        .select({ status: events.status })
        .from(events)
        .where(and(eq(events.id, i.id), eq(events.organizerId, actor.id)))
        .for("update");
      if (!event) throw new EventError("not-found");
      if (!allowedActions(event.status, { owner: true, moderator: false }).includes("delete")) throw new EventError("invalid-transition");

      const [row] = await tx
        .delete(events)
        .where(and(eq(events.id, i.id), eq(events.organizerId, actor.id), ne(events.status, "suspended")))
        .returning({ title: events.title, coverImageUrl: events.coverImageUrl });
      if (!row) throw new EventError("not-found");
      return row;
    });
  } catch (error) {
    if (isForeignKeyViolation(error)) throw new EventError("has-orders");
    throw error;
  }
  await deleteCoverBlob(deleted.coverImageUrl);
  logEventAudit({ action: "delete", eventId: i.id, actorId: actor.id });
  return { title: deleted.title };
}
