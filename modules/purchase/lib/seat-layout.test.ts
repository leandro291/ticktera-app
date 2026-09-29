import { describe, expect, it } from "vitest";
import { VENUE_LAYOUTS } from "../data/venues";
import type { SeatSection } from "../types/venue";
import { buildSeatSection, SEAT_MAP_SCALE, SEAT_PITCH, SEAT_R } from "./seat-layout";

const { stadium, theater } = VENUE_LAYOUTS;
const zone = (layout: typeof stadium, id: string) => layout.zones.find((z) => z.id === id)!;
const build = (layout: typeof stadium, id: string) => buildSeatSection("test", zone(layout, id), layout, "available");

/** Distance and angle (0° = towards the audience) of a seat from the stage centre, in venue-map units. */
function polarOf(section: SeatSection, cx: number, cy: number) {
  const dx = cx - section.stage.cx;
  const dy = cy - section.stage.cy;
  return { radius: Math.hypot(dx, dy) / SEAT_MAP_SCALE, angle: (Math.atan2(dx, dy) * 180) / Math.PI };
}

describe("buildSeatSection", () => {
  it("AC15: every seat sits inside its zone's ring sector (the seat map matches the venue map)", () => {
    for (const [layout, id] of [[stadium, "oriente"], [stadium, "norte"], [theater, "platea"], [theater, "mezzanine"]] as const) {
      const section = build(layout, id);
      const { arc } = zone(layout, id);
      expect(section.seats.length).toBeGreaterThan(20);
      for (const seat of section.seats) {
        const p = polarOf(section, seat.cx, seat.cy);
        expect(p.radius).toBeGreaterThan(arc.inner);
        expect(p.radius).toBeLessThan(arc.outer);
        expect(p.angle).toBeGreaterThan(arc.from);
        expect(p.angle).toBeLessThan(arc.to);
      }
    }
  });

  it("AC15: rows are arcs around the stage, front row first, and outer rows hold more seats", () => {
    const section = build(theater, "platea");
    const byRow = section.rows.map((r) => section.seats.filter((s) => s.row === r.label));
    const radii = byRow.map((row) => polarOf(section, row[0].cx, row[0].cy).radius);
    expect(radii).toEqual([...radii].sort((a, b) => a - b));
    for (const row of byRow) {
      const r = row.map((s) => polarOf(section, s.cx, s.cy).radius);
      expect(Math.max(...r) - Math.min(...r)).toBeLessThan(0.1);
    }
    expect(byRow.at(-1)!.length).toBeGreaterThan(byRow[0].length);
  });

  it("AC15: neighbours in a row are one pitch apart except across a radial aisle", () => {
    const row = build(theater, "mezzanine").seats.filter((s) => s.row === "A");
    const gaps = row.slice(1).map((s, i) => Math.hypot(s.cx - row[i].cx, s.cy - row[i].cy));
    expect(gaps.filter((g) => Math.abs(g - SEAT_PITCH) < 1).length).toBeGreaterThan(gaps.length / 2);
    expect(Math.max(...gaps)).toBeGreaterThan(SEAT_PITCH * 1.5);
  });

  it("AC15: the canvas holds the stage and all seats, and the focus box frames the seats", () => {
    for (const id of ["oriente", "norte", "occidente"]) {
      const s = build(stadium, id);
      expect(s.stage.cx - s.stage.r).toBeGreaterThanOrEqual(0);
      expect(s.stage.cx + s.stage.r).toBeLessThanOrEqual(s.width);
      for (const seat of s.seats) {
        expect(seat.cx - SEAT_R).toBeGreaterThanOrEqual(s.focus.x);
        expect(seat.cx + SEAT_R).toBeLessThanOrEqual(s.focus.x + s.focus.width);
        expect(seat.cy + SEAT_R).toBeLessThanOrEqual(s.height);
      }
      expect(s.neighbors.map((n) => n.zoneId)).not.toContain(id);
    }
  });

  it("is deterministic for the same event and zone", () => {
    expect(build(stadium, "oriente")).toEqual(build(stadium, "oriente"));
  });
});
