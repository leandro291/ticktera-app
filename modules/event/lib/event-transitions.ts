import type { EventDbStatus } from "../types/event-list";

export type EventAction = "edit" | "publish" | "unpublish" | "cancel" | "suspend" | "reactivate" | "delete";

// D2. Solo el estado: `unpublish` (sin ventas) y `delete` (sin órdenes) además los decide el servicio con datos.
const OWNER_ACTIONS: Record<EventDbStatus, readonly EventAction[]> = {
  draft: ["edit", "publish", "delete"],
  published: ["edit", "unpublish", "cancel", "delete"],
  suspended: [], // un organizador no escapa de una moderación
  cancelled: ["delete"],
};

const MODERATOR_ACTIONS: Record<EventDbStatus, readonly EventAction[]> = {
  draft: [],
  published: ["suspend", "cancel"],
  suspended: ["reactivate", "cancel"],
  cancelled: [],
};

const NEXT_STATUS: Record<Exclude<EventAction, "edit" | "delete">, EventDbStatus> = {
  publish: "published",
  unpublish: "draft",
  cancel: "cancelled",
  suspend: "suspended",
  reactivate: "published",
};

export function allowedActions(status: EventDbStatus, who: { owner: boolean; moderator: boolean }): EventAction[] {
  const actions = [...(who.owner ? OWNER_ACTIONS[status] : []), ...(who.moderator ? MODERATOR_ACTIONS[status] : [])];
  return [...new Set(actions)];
}

export function nextStatus(action: Exclude<EventAction, "edit" | "delete">): EventDbStatus {
  return NEXT_STATUS[action];
}
