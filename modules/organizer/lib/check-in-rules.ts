import type { CheckInErrorCode } from "../types/check-in";

export interface CheckInCandidate {
  ticketStatus: "valid" | "used" | "void";
  orderStatus: "pending" | "paid" | "expired" | "refunded";
  eventStatus: "draft" | "published" | "cancelled" | "suspended";
  eventOrganizerId: string;
}

/** Precedencia (D4): evento ajeno → used → void/orden no paid → evento no published → ok. */
export function classifyTicket(
  c: CheckInCandidate,
  actor: { id: string; canCheckInAny: boolean },
): "ok" | Exclude<CheckInErrorCode, "invalid-code" | "rate-limited"> {
  if (!actor.canCheckInAny && c.eventOrganizerId !== actor.id) return "not-found";
  if (c.ticketStatus === "used") return "already-used";
  if (c.ticketStatus === "void" || c.orderStatus !== "paid") return "void";
  if (c.eventStatus !== "published") return "event-inactive";
  return "ok";
}
