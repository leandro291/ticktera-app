import type { Order, OrderItem, OrderSeat } from "../types/order";

/** "Fila C · 12, 13 · Fila D · 4" */
export function formatOrderSeats(seats: OrderSeat[]): string {
  const rows = new Map<string, number[]>();
  for (const seat of [...seats].sort((a, b) => a.row.localeCompare(b.row) || a.number - b.number)) {
    rows.set(seat.row, [...(rows.get(seat.row) ?? []), seat.number]);
  }
  return [...rows].map(([row, numbers]) => `Fila ${row} · ${numbers.join(", ")}`).join(" · ");
}

export interface OrderTicket {
  /** "TK-24817-01" */
  code: string;
  zoneName: string;
  seat?: OrderSeat;
}

/** One ticket per unit bought, in order: each keeps its zone and, for numbered zones, its seat. */
export function getOrderTickets(order: Order): OrderTicket[] {
  const units = order.items.flatMap((item: OrderItem) =>
    Array.from({ length: item.quantity }, (_, i) => ({ zoneName: item.zoneName, seat: item.seats[i] })),
  );
  return units.map((unit, i) => ({ ...unit, code: `${order.code}-${String(i + 1).padStart(2, "0")}` }));
}
