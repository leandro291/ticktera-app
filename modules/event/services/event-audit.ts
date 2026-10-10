import type { EventDbStatus } from "../types/event-list";

/** D18: auditoría mínima por log estructurado, sin tabla ni PII (solo ids). */
export function logEventAudit(e: {
  action: string;
  eventId: string;
  actorId: string;
  from?: EventDbStatus;
  to?: EventDbStatus;
  ack?: boolean;
}): void {
  console.info(JSON.stringify({ evt: "event.audit", ...e }));
}
