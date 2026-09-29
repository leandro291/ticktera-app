import type { AvailabilityStatus } from "@/modules/event";
import type { Seat, SeatSection } from "../types/venue";

export const SEAT_SIZE = 22;
const PITCH = 28;
const AISLE_EVERY = 8;
const AISLE_GAP = 14;
const MARGIN_X = 32;
const MARGIN_Y = 8;

const TAKEN_RATIO: Record<AvailabilityStatus, number> = {
  available: 0.35,
  "last-tickets": 0.85,
  "sold-out": 1,
};

/** Deterministic PRNG so the mock map is stable between renders and server/client. */
function seededRandom(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const rowLabel = (index: number) => String.fromCharCode(65 + index);

export function buildSeatSection(
  seed: string,
  zoneId: string,
  seating: { rows: number; seatsPerRow: number },
  status: AvailabilityStatus,
): SeatSection {
  const random = seededRandom(`${seed}:${zoneId}`);
  const aisles = Math.floor((seating.seatsPerRow - 1) / AISLE_EVERY);
  const width = MARGIN_X * 2 + seating.seatsPerRow * PITCH + aisles * AISLE_GAP;
  const height = MARGIN_Y * 2 + seating.rows * PITCH;
  const rows: SeatSection["rows"] = [];
  const seats: Seat[] = [];

  for (let r = 0; r < seating.rows; r++) {
    const label = rowLabel(r);
    const y = MARGIN_Y + r * PITCH;
    rows.push({ label, y: y + SEAT_SIZE / 2 });
    for (let s = 0; s < seating.seatsPerRow; s++) {
      seats.push({
        id: `${zoneId}-${label}-${s + 1}`,
        row: label,
        number: s + 1,
        x: MARGIN_X + s * PITCH + Math.floor(s / AISLE_EVERY) * AISLE_GAP,
        y,
        taken: random() < TAKEN_RATIO[status],
      });
    }
  }

  return { zoneId, width, height, rows, seats };
}
