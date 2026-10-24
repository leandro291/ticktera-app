export type CheckInErrorCode =
  | "invalid-code"
  | "not-found"
  | "already-used"
  | "void"
  | "event-inactive"
  | "rate-limited";

export interface CheckedInTicket {
  eventTitle: string;
  tierName: string;
  holderName: string;
}

export type CheckInResult =
  | { ok: true; ticket: CheckedInTicket }
  | { ok: false; error: string; code?: CheckInErrorCode }; // code ausente = fallo de permiso/genérico
