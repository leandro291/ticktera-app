import type { EventDbStatus } from "./event-list";

export interface TierInput {
  id?: string;
  name: string;
  priceCents: number;
  capacity: number;
  maxPerOrder: number;
}

export interface SaveEventInput {
  id?: string;
  expectedUpdatedAt?: string; // ISO; obligatorio si hay id
  title: string;
  categoryId: string;
  description: string;
  date: string; // yyyy-mm-dd, hora de Lima
  startTime: string; // HH:mm, hora de Lima
  venueName: string;
  address: string; // "" => null en BD
  city: string;
  tiers: TierInput[]; // posición = sort_order
  publish: boolean;
  acknowledgeBuyerImpact: boolean;
}

export type TransitionAction = "publish" | "unpublish" | "cancel";
export type ModerationAction = "suspend" | "reactivate" | "cancel";

export type EventErrorCode =
  | "not-found"
  | "not-editable"
  | "invalid-transition"
  | "not-publishable"
  | "frozen"
  | "stale"
  | "has-sales"
  | "has-orders"
  | "invalid-category"
  | "limit-reached"
  | "slug-conflict"
  | "storage-unavailable"
  | "storage-failed"
  | "invalid-image";

export type EventActionResult =
  | { ok: true; notice: string; id?: string; updatedAt?: string }
  | { ok: false; error: string; code?: EventErrorCode; fieldErrors?: Record<string, string> }; // clave = ruta ("title", "tiers.1.priceCents")

/** Datos para editar un evento propio. Nunca incluye organizerId. */
export interface EventEditData {
  id: string;
  status: EventDbStatus;
  updatedAt: string; // ISO
  title: string;
  categoryId: string;
  description: string;
  coverImageUrl: string | null;
  date: string;
  startTime: string;
  venueName: string;
  address: string;
  city: string;
  hasSales: boolean; // algún tipo con comprometido > 0
  tiers: {
    id: string;
    name: string;
    priceCents: number;
    capacity: number;
    maxPerOrder: number;
    sold: number;
    reserved: number;
    hasOrders: boolean;
  }[];
}
