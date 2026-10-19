import type { CartLine, ZoneTier } from "../types/venue";

export interface CartItem {
  tier: ZoneTier;
  quantity: number;
  amount: number;
}

export interface CartSummary {
  items: CartItem[];
  total: number;
  count: number;
}

/** Cart lines resolved against the event's zones, in map order. Lines of unknown zones are ignored. */
export function getCartSummary(lines: CartLine[], tiers: ZoneTier[]): CartSummary {
  const items = tiers.flatMap<CartItem>((tier) => {
    const line = lines.find((l) => l.zoneId === tier.id);
    if (!line || line.quantity <= 0) return [];
    return [{ tier, quantity: line.quantity, amount: line.quantity * tier.price }];
  });

  return {
    items,
    total: items.reduce((sum, i) => sum + i.amount, 0),
    count: items.reduce((sum, i) => sum + i.quantity, 0),
  };
}

export const formatTicketCount = (count: number) => (count === 1 ? "1 entrada" : `${count} entradas`);
