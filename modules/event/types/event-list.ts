export const EVENT_LIST_SCOPES = ["mine", "all", "published"] as const;
export type EventListScope = (typeof EVENT_LIST_SCOPES)[number];
export type EventDbStatus = "draft" | "published" | "cancelled" | "suspended";

/** Alcance público: sin ventas. */
export interface EventListItem {
  id: string; // uuid de events.id
  slug: string;
  title: string;
  categoryName: string;
  coverImageUrl: string | null;
  startsAt: string; // ISO 8601
  venueName: string;
  city: string;
  status: EventDbStatus;
  priceFromCents: number | null; // mínimo de ticket_types.price_cents; null sin tipos
}

export interface TierSales {
  id: string;
  name: string;
  priceCents: number;
  capacity: number;
  sold: number;
  revenueCents: number;
}

/** Alcances privados (`mine`, `all`). */
export interface ManagedEventItem extends EventListItem {
  sales: { sold: number; capacity: number; revenueCents: number; tiers: TierSales[] }; // tiers por sort_order
}

export type EventItemFor<S extends EventListScope> = S extends "published"
  ? EventListItem
  : ManagedEventItem;
export type EventListResponse<S extends EventListScope = EventListScope> = {
  items: EventItemFor<S>[];
};
export type EventListErrorCode =
  | "invalid-query"
  | "unauthenticated"
  | "suspended"
  | "forbidden"
  | "internal";
