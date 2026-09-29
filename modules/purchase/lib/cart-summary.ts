import type { CartLine, Seat, SeatSection, ZoneTier } from "../types/venue";

export interface CartItem {
  tier: ZoneTier;
  quantity: number;
  seats: Seat[];
  amount: number;
}

export interface CartSummary {
  items: CartItem[];
  total: number;
  count: number;
}

const bySeat = (a: Seat, b: Seat) => a.row.localeCompare(b.row) || a.number - b.number;

/** Cart lines resolved against the event's tiers, in map order. */
export function getCartSummary(lines: CartLine[], tiers: ZoneTier[], sections: SeatSection[]): CartSummary {
  const items = tiers.flatMap<CartItem>((tier) => {
    const line = lines.find((l) => l.zoneId === tier.id);
    if (!line || line.quantity <= 0) return [];
    const section = sections.find((s) => s.zoneId === tier.id);
    const seats = (section?.seats ?? []).filter((s) => line.seatIds.includes(s.id)).sort(bySeat);
    return [{ tier, quantity: line.quantity, seats, amount: line.quantity * tier.price }];
  });

  return {
    items,
    total: items.reduce((sum, i) => sum + i.amount, 0),
    count: items.reduce((sum, i) => sum + i.quantity, 0),
  };
}

/** "Fila C · 12, 13 · Fila D · 4" */
export function formatSeatList(seats: Seat[]): string {
  const rows = new Map<string, number[]>();
  for (const seat of [...seats].sort(bySeat)) rows.set(seat.row, [...(rows.get(seat.row) ?? []), seat.number]);
  return [...rows].map(([row, numbers]) => `Fila ${row} · ${numbers.join(", ")}`).join(" · ");
}

export const formatTicketCount = (count: number) => (count === 1 ? "1 entrada" : `${count} entradas`);
