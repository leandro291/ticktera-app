import type { Seat, SeatSection } from "../types/venue";
import { SEAT_PITCH } from "./seat-layout";

export interface BestSeats {
  seatIds: string[];
  /** False when the pick had to be completed with nearby, non-adjacent seats. */
  contiguous: boolean;
}

/** Two seats of a row are side by side when nothing but the regular pitch separates them (an aisle breaks it). */
const adjacent = (a: Seat, b: Seat) => b.number === a.number + 1 && Math.hypot(b.cx - a.cx, b.cy - a.cy) <= SEAT_PITCH * 1.15;

/**
 * "Mejores disponibles": `count` free seats side by side in the front-most row that has room, as centred as possible.
 * Seats the buyer already holds count as free (the pick replaces them). When no row has enough adjacent seats,
 * returns the free seats closest to the best one available, flagged as not contiguous.
 */
export function pickBestSeats(section: SeatSection, count: number, alreadySelected: string[] = []): BestSeats {
  if (count <= 0) return { seatIds: [], contiguous: true };
  const held = new Set(alreadySelected);
  const isFree = (s: Seat) => !s.taken || held.has(s.id);

  const rows = section.rows.map((row) => section.seats.filter((s) => s.row === row.label).sort((a, b) => a.number - b.number));

  for (const seats of rows) {
    const middle = (seats.length - 1) / 2;
    let best: { start: number; distance: number } | null = null;
    for (let start = 0; start + count <= seats.length; start++) {
      const window = seats.slice(start, start + count);
      if (!window.every(isFree)) continue;
      if (!window.every((seat, i) => i === 0 || adjacent(window[i - 1], seat))) continue;
      const distance = Math.abs(start + (count - 1) / 2 - middle);
      if (!best || distance < best.distance) best = { start, distance };
    }
    if (best) return { seatIds: seats.slice(best.start, best.start + count).map((s) => s.id), contiguous: true };
  }

  // Fallback: anchor on the front-most, most centred free seat and take its nearest free neighbours.
  const free = rows.flatMap((seats) => {
    const middle = (seats.length - 1) / 2;
    return seats.map((seat, i) => ({ seat, rank: Math.abs(i - middle) })).filter(({ seat }) => isFree(seat));
  });
  if (!free.length) return { seatIds: [], contiguous: false };
  const anchor = free.reduce((a, b) => (b.rank < a.rank && b.seat.row === a.seat.row ? b : a)).seat;
  const nearest = free
    .map(({ seat }) => seat)
    .sort((a, b) => Math.hypot(a.cx - anchor.cx, a.cy - anchor.cy) - Math.hypot(b.cx - anchor.cx, b.cy - anchor.cy))
    .slice(0, count);
  return { seatIds: nearest.map((s) => s.id), contiguous: false };
}
