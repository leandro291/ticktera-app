import type { EventCategory } from "@/modules/event";

export type OrganizerEventStatus = "published" | "draft";

export interface TicketTier {
  id: string;
  name: string;
  price: number;
  capacity: number;
  sold: number;
}

/** An event as its organizer manages it (always priced in soles). */
export interface OrganizerEvent {
  id: string;
  title: string;
  category: EventCategory;
  description: string;
  /** Catalog image path or a data URL from the cover upload. */
  image?: string;
  /** ISO date (yyyy-mm-dd); empty on drafts without a date. */
  date: string;
  startTime: string;
  venue: string;
  city: string;
  status: OrganizerEventStatus;
  tiers: TicketTier[];
  /** Public catalog id, when the event is listed on the site. */
  catalogId?: string;
}

/** Form state for a ticket tier: inputs keep the raw text the organizer typed. */
export interface TierDraft {
  id: string;
  name: string;
  price: string;
  quantity: string;
}

export interface EventDraft {
  title: string;
  category: EventCategory;
  description: string;
  image?: string;
  date: string;
  startTime: string;
  venue: string;
  city: string;
  tiers: TierDraft[];
}
