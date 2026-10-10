import type { EventErrorCode } from "../types/event-write";

/** Error esperado del CRUD de eventos: la acción lo traduce a un mensaje fijo por código (sin detalles). */
export class EventError extends Error {
  readonly code: EventErrorCode;
  readonly fieldErrors?: Record<string, string>;

  constructor(code: EventErrorCode, fieldErrors?: Record<string, string>) {
    super(code);
    this.name = "EventError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}
