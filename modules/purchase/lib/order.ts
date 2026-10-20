import type { OrderSeat } from "../types/order";

/** "Fila C · 12, 13 · Fila D · 4" */
export function formatOrderSeats(seats: OrderSeat[]): string {
  const rows = new Map<string, number[]>();
  for (const seat of [...seats].sort((a, b) => a.row.localeCompare(b.row) || a.number - b.number)) {
    rows.set(seat.row, [...(rows.get(seat.row) ?? []), seat.number]);
  }
  return [...rows].map(([row, numbers]) => `Fila ${row} · ${numbers.join(", ")}`).join(" · ");
}
