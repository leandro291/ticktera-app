import type { Point, ZoneArc } from "../types/venue";

/** Zone map canvas: 1000 units wide, stage centre on the top edge. */
export const MAP_WIDTH = 1000;
const STAGE_TOP = 28;
const BOTTOM_MARGIN = 24;

export const mapCenter: Point = { x: MAP_WIDTH / 2, y: STAGE_TOP };

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Point at `radius` from the stage centre; 0° points straight at the audience, negative angles go left. */
export function polar(radius: number, angleDeg: number, center: Point = mapCenter): Point {
  return { x: center.x + radius * Math.sin(rad(angleDeg)), y: center.y + radius * Math.cos(rad(angleDeg)) };
}

const fmt = (p: Point) => `${Math.round(p.x * 10) / 10} ${Math.round(p.y * 10) / 10}`;

/** SVG path of a ring sector (a zone wrapped around the stage). */
export function sectorPath({ inner, outer, from, to }: ZoneArc, center: Point = mapCenter): string {
  const large = to - from > 180 ? 1 : 0;
  // Left → bottom → right is counter-clockwise on screen (sweep 0); the inner edge comes back clockwise.
  return [
    `M ${fmt(polar(outer, from, center))}`,
    `A ${outer} ${outer} 0 ${large} 0 ${fmt(polar(outer, to, center))}`,
    `L ${fmt(polar(inner, to, center))}`,
    `A ${inner} ${inner} 0 ${large} 1 ${fmt(polar(inner, from, center))}`,
    "Z",
  ].join(" ");
}

/** Middle of a sector, where its label goes. */
export const sectorCentroid = ({ inner, outer, from, to }: ZoneArc, center: Point = mapCenter): Point =>
  polar((inner + outer) / 2, (from + to) / 2, center);

/** Half-moon stage: flat back edge at `y`, round front facing the audience. */
export function halfMoonPath(cx: number, y: number, rx: number, ry: number = rx): string {
  return `M ${cx - rx} ${y} A ${rx} ${ry} 0 0 0 ${cx + rx} ${y} Z`;
}

/** Deepest point of a sector below the stage centre. */
const depth = ({ outer, from, to }: ZoneArc) => outer * (from <= 0 && to >= 0 ? 1 : Math.max(Math.cos(rad(from)), Math.cos(rad(to))));

/** Height of the zone map so every zone fits below the stage. */
export function mapHeight(zones: ZoneArc[], stageRadius: number): number {
  return Math.ceil(STAGE_TOP + Math.max(stageRadius, ...zones.map(depth)) + BOTTOM_MARGIN);
}
