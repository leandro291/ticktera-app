import type { AvailabilityStatus } from "@/modules/event";
import type { Point, Seat, SeatRow, SeatSection } from "../types/venue";

/** Seat radius (22px circles) and centre-to-centre spacing. */
export const SEAT_R = 11;
export const SEAT_PITCH = 28;
const ROW_PITCH = 30;
const AISLE_EVERY = 8;
const AISLE_GAP = 16;
/** Distance from the outer seat's centre to its row letter. */
const LABEL_OFFSET = SEAT_R + 14;
const MARGIN = 16;
/** Depth of the half-moon stage and its gap to the first row. */
const STAGE_H = 64;
const STAGE_GAP = 26;

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

/**
 * Maps a position along a row (`along`, 0 = row centre) to the plane. Straight rows keep `along` as x; curved rows
 * wrap it on concentric arcs around a point above the stage, so edges bend towards it like a theatre.
 */
function rowProjector(curve: number, halfSpan: number) {
  if (curve <= 0) return (along: number, row: number): Point => ({ x: along, y: row * ROW_PITCH });
  const frontRadius = halfSpan / (curve * 1.1);
  return (along: number, row: number): Point => {
    const radius = frontRadius + row * ROW_PITCH;
    const angle = along / radius;
    return { x: radius * Math.sin(angle), y: radius * Math.cos(angle) - frontRadius };
  };
}

export function buildSeatSection(
  seed: string,
  zoneId: string,
  seating: { rows: number; seatsPerRow: number },
  status: AvailabilityStatus,
  curve = 0,
): SeatSection {
  const random = seededRandom(`${seed}:${zoneId}`);
  const aisles = Math.floor((seating.seatsPerRow - 1) / AISLE_EVERY);
  const span = (seating.seatsPerRow - 1) * SEAT_PITCH + aisles * AISLE_GAP;
  const alongOf = (s: number) => s * SEAT_PITCH + Math.floor(s / AISLE_EVERY) * AISLE_GAP - span / 2;
  const project = rowProjector(curve, span / 2);

  const rawSeats: Seat[] = [];
  const rawRows: SeatRow[] = [];
  for (let r = 0; r < seating.rows; r++) {
    const label = rowLabel(r);
    rawRows.push({
      label,
      start: project(alongOf(0) - LABEL_OFFSET, r),
      end: project(alongOf(seating.seatsPerRow - 1) + LABEL_OFFSET, r),
    });
    for (let s = 0; s < seating.seatsPerRow; s++) {
      const { x, y } = project(alongOf(s), r);
      rawSeats.push({ id: `${zoneId}-${label}-${s + 1}`, row: label, number: s + 1, cx: x, cy: y, taken: random() < TAKEN_RATIO[status] });
    }
  }

  // Fit everything (seats + row letters) into a box below the stage.
  const xs = [...rawSeats.map((s) => s.cx), ...rawRows.flatMap((r) => [r.start.x, r.end.x])];
  const ys = [...rawSeats.map((s) => s.cy), ...rawRows.flatMap((r) => [r.start.y, r.end.y])];
  const minX = Math.min(...xs) - SEAT_R;
  const minY = Math.min(...ys) - SEAT_R;
  const dx = MARGIN - minX;
  const dy = MARGIN + STAGE_H + STAGE_GAP - minY;
  const width = Math.ceil(Math.max(...xs) + SEAT_R + dx + MARGIN);
  const height = Math.ceil(Math.max(...ys) + SEAT_R + dy + MARGIN);
  const move = (p: Point): Point => ({ x: round(p.x + dx), y: round(p.y + dy) });

  const stageWidth = Math.round(width * 0.5);
  return {
    zoneId,
    width,
    height,
    stage: { x: Math.round((width - stageWidth) / 2), y: MARGIN, width: stageWidth, height: STAGE_H, curve },
    rows: rawRows.map((r) => ({ label: r.label, start: move(r.start), end: move(r.end) })),
    seats: rawSeats.map((s) => {
      const p = move({ x: s.cx, y: s.cy });
      return { ...s, cx: p.x, cy: p.y };
    }),
  };
}

const round = (n: number) => Math.round(n * 10) / 10;
