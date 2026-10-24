import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { events, orderItems, orders, ticketTypes, tickets } from "@/db/schema";
import { can, type Role } from "@/modules/auth";
import { classifyTicket } from "../lib/check-in-rules";
import { createAttemptLimiter } from "../lib/attempt-limiter";
import type { CheckInInput } from "../schemas/check-in-schema";
import type { CheckedInTicket, CheckInErrorCode } from "../types/check-in";

/** Error esperado del check-in: la action lo traduce a un mensaje fijo por código. */
export class CheckInError extends Error {
  readonly code: CheckInErrorCode;

  constructor(code: CheckInErrorCode) {
    super(code);
    this.name = "CheckInError";
    this.code = code;
  }
}

// D5: 15 fallos por minuto por usuario. Singleton de proceso (Q1).
const limiter = createAttemptLimiter({ max: 15, windowMs: 60_000 });

function fail(actorId: string, code: CheckInErrorCode): never {
  limiter.recordFailure(actorId);
  throw new CheckInError(code);
}

/** D3: SELECT → reglas puras → UPDATE condicional atómico. La unicidad la da la BD. Lanza CheckInError. */
export async function checkInTicket(
  actor: { id: string; role: Role },
  input: CheckInInput,
): Promise<CheckedInTicket> {
  if (limiter.isBlocked(actor.id)) throw new CheckInError("rate-limited");

  const [row] = await db
    .select({
      id: tickets.id,
      holderName: tickets.holderName,
      ticketStatus: tickets.status,
      orderStatus: orders.status,
      tierName: ticketTypes.name,
      eventTitle: events.title,
      eventStatus: events.status,
      eventOrganizerId: events.organizerId,
    })
    .from(tickets)
    .innerJoin(orderItems, eq(orderItems.id, tickets.orderItemId))
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .innerJoin(ticketTypes, eq(ticketTypes.id, orderItems.ticketTypeId))
    .innerJoin(events, eq(events.id, ticketTypes.eventId))
    .where(eq(tickets.code, input.code))
    .limit(1);

  if (!row) return fail(actor.id, "not-found");

  const verdict = classifyTicket(row, {
    id: actor.id,
    canCheckInAny: can(actor.role, "events:read-all"),
  });
  if (verdict !== "ok") return fail(actor.id, verdict);

  // Si otra puerta ganó la carrera, RETURNING viene vacío.
  const updated = await db
    .update(tickets)
    .set({ status: "used" })
    .where(and(eq(tickets.id, row.id), eq(tickets.status, "valid")))
    .returning({ id: tickets.id });
  if (updated.length === 0) return fail(actor.id, "already-used");

  return { eventTitle: row.eventTitle, tierName: row.tierName, holderName: row.holderName };
}
