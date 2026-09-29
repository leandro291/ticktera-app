import type { AvailabilityStatus } from "@/modules/event";
import type { Box, Point, Seat, SeatRow, SeatSection, VenueLayout, VenueZone, ZoneArc } from "../types/venue";
import { polar, sectorCentroid, sectorPath } from "./venue-geometry";

/** Seat radius (22px circles) and centre-to-centre spacing along a row. */
export const SEAT_R = 11;
export const SEAT_PITCH = 28;
const ROW_PITCH = 30;
/** Pixels per venue-map unit: the seat map is the venue map at this zoom, for every zone. */
export const SEAT_MAP_SCALE = 1.7;
/** Space between the zone's outline and its outer seats. */
const EDGE_PAD = 14;
/** Radial aisles: one roughly every `BLOCK_DEG` degrees, `AISLE` px wide. */
const BLOCK_DEG = 24;
const AISLE = 26;
/** Distance from the outer seat's centre to its row letter. */
const LABEL_OFFSET = SEAT_R + 13;
const MARGIN = 28;
const FOCUS_PAD = 18;

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
const toDeg = (rad: number) => (rad * 180) / Math.PI;
const round = (n: number) => Math.round(n * 10) / 10;
const ORIGIN: Point = { x: 0, y: 0 };

const scaleArc = (arc: ZoneArc): ZoneArc => ({ ...arc, inner: arc.inner * SEAT_MAP_SCALE, outer: arc.outer * SEAT_MAP_SCALE });

/** Points along a sector's outline, to measure its bounding box. */
function outlinePoints(arc: ZoneArc): Point[] {
  const points: Point[] = [];
  for (let a = arc.from; a <= arc.to; a += 2) points.push(polar(arc.inner, a, ORIGIN), polar(arc.outer, a, ORIGIN));
  points.push(polar(arc.inner, arc.to, ORIGIN), polar(arc.outer, arc.to, ORIGIN));
  return points;
}

/** Angles (degrees) of the seats of one row: blocks of seats split by radial aisles, centred in each block. */
function rowAngles(arc: ZoneArc, radius: number): number[] {
  const blocks = Math.max(1, Math.round((arc.to - arc.from) / BLOCK_DEG));
  const blockSpan = (arc.to - arc.from) / blocks;
  const step = toDeg(SEAT_PITCH / radius);
  const angles: number[] = [];
  for (let b = 0; b < blocks; b++) {
    const padStart = toDeg(((b === 0 ? EDGE_PAD : AISLE / 2) + SEAT_R) / radius);
    const padEnd = toDeg(((b === blocks - 1 ? EDGE_PAD : AISLE / 2) + SEAT_R) / radius);
    const start = arc.from + b * blockSpan + padStart;
    const end = arc.from + (b + 1) * blockSpan - padEnd;
    if (end < start) continue;
    const count = Math.floor((end - start) / step) + 1;
    const mid = (start + end) / 2;
    for (let i = 0; i < count; i++) angles.push(mid + (i - (count - 1) / 2) * step);
  }
  return angles;
}

function boundsOf(points: Point[], pad = 0): Box {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs) - pad;
  const y = Math.min(...ys) - pad;
  return { x, y, width: Math.max(...xs) + pad - x, height: Math.max(...ys) + pad - y };
}

/**
 * Seat map of a numbered zone. Rows are concentric arcs inside the zone's ring sector (front row closest to the
 * stage), outer rows hold more seats and radial aisles line up across rows, like a real amphitheatre.
 */
export function buildSeatSection(seed: string, zone: VenueZone, layout: VenueLayout, status: AvailabilityStatus): SeatSection {
  const random = seededRandom(`${seed}:${zone.id}`);
  const arc = scaleArc(zone.arc);
  const stageR = layout.stageRadius * SEAT_MAP_SCALE;

  const usable = arc.outer - arc.inner - 2 * (EDGE_PAD + SEAT_R);
  const rowCount = Math.max(1, Math.floor(usable / ROW_PITCH) + 1);
  const firstRadius = arc.inner + (arc.outer - arc.inner - (rowCount - 1) * ROW_PITCH) / 2;

  const rawSeats: Seat[] = [];
  const rawRows: SeatRow[] = [];
  for (let r = 0; r < rowCount; r++) {
    const label = rowLabel(r);
    const radius = firstRadius + r * ROW_PITCH;
    const angles = rowAngles(arc, radius);
    if (!angles.length) continue;
    const labelShift = toDeg(LABEL_OFFSET / radius);
    rawRows.push({ label, start: polar(radius, angles[0] - labelShift, ORIGIN), end: polar(radius, angles[angles.length - 1] + labelShift, ORIGIN) });
    angles.forEach((angle, i) => {
      const p = polar(radius, angle, ORIGIN);
      rawSeats.push({ id: `${zone.id}-${label}-${i + 1}`, row: label, number: i + 1, cx: p.x, cy: p.y, taken: random() < TAKEN_RATIO[status] });
    });
  }

  // Canvas: the whole venue (stage + every zone), so zooming out shows where the zone sits; the view opens on `focus`.
  const seatPoints = [...rawSeats.flatMap((s) => [{ x: s.cx - SEAT_R, y: s.cy - SEAT_R }, { x: s.cx + SEAT_R, y: s.cy + SEAT_R }]), ...rawRows.flatMap((r) => [r.start, r.end])];
  const venuePoints = layout.zones.flatMap((z) => outlinePoints(scaleArc(z.arc)));
  const box = boundsOf([...venuePoints, ...seatPoints, { x: -stageR, y: 0 }, { x: stageR, y: stageR }], MARGIN);
  const center: Point = { x: -box.x, y: -box.y };
  const move = (p: Point): Point => ({ x: round(p.x + center.x), y: round(p.y + center.y) });
  const focus = boundsOf(seatPoints.map(move), FOCUS_PAD);

  return {
    zoneId: zone.id,
    width: Math.ceil(box.width),
    height: Math.ceil(box.height),
    stage: { cx: round(center.x), cy: round(center.y), r: round(stageR) },
    outline: sectorPath(arc, center),
    neighbors: layout.zones
      .filter((z) => z.id !== zone.id)
      .map((z) => ({ zoneId: z.id, name: z.name, path: sectorPath(scaleArc(z.arc), center), label: move(sectorCentroid(scaleArc(z.arc), ORIGIN)) })),
    focus,
    anchor: move(sectorCentroid(arc, ORIGIN)),
    rows: rawRows.map((r) => ({ label: r.label, start: move(r.start), end: move(r.end) })),
    seats: rawSeats.map((s) => {
      const p = move({ x: s.cx, y: s.cy });
      return { ...s, cx: p.x, cy: p.y };
    }),
  };
}
