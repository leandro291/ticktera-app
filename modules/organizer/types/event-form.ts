/** Form state for a ticket tier: inputs keep the raw text the organizer typed. */
export interface TierDraft {
  id: string; // local key for React
  serverId?: string; // ticket_types.id when the tier already exists
  name: string;
  price: string; // soles, as typed
  quantity: string;
  maxPerOrder: number;
  committed: number; // sold + reserved; > 0 freezes price, name and removal (D5)
  hasOrders: boolean; // any order_items: can't be removed (FK)
}

export interface EventDraft {
  title: string;
  categoryId: string;
  description: string;
  date: string; // yyyy-mm-dd (Lima)
  startTime: string; // HH:mm (Lima)
  venueName: string;
  address: string;
  city: string;
  tiers: TierDraft[];
}
