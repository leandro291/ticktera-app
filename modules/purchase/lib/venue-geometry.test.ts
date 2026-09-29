import { describe, expect, it } from "vitest";
import { VENUE_LAYOUTS } from "../data/venues";
import { halfMoonPath, MAP_WIDTH, mapCenter, mapHeight, polar, sectorCentroid, sectorPath } from "./venue-geometry";

describe("polar", () => {
  it("AC14: 0° points at the audience (down) and negative angles go to the stage's left", () => {
    expect(polar(100, 0)).toEqual({ x: mapCenter.x, y: mapCenter.y + 100 });
    const left = polar(100, -90);
    expect(left.x).toBeCloseTo(mapCenter.x - 100);
    expect(left.y).toBeCloseTo(mapCenter.y);
  });
});

describe("sectorPath", () => {
  it("AC14: draws the outer arc left→right and comes back on the inner arc", () => {
    const d = sectorPath({ inner: 100, outer: 200, from: -30, to: 30 });
    expect(d).toMatch(/^M [\d.]+ [\d.]+ A 200 200 0 0 0 [\d.]+ [\d.]+ L [\d.]+ [\d.]+ A 100 100 0 0 1 [\d.]+ [\d.]+ Z$/);
  });

  it("AC14: uses the large-arc flag only for sectors wider than 180°", () => {
    expect(sectorPath({ inner: 10, outer: 20, from: -100, to: 100 })).toContain("A 20 20 0 1 0");
  });
});

describe("sectorCentroid", () => {
  it("AC14: sits halfway between the radii on the bisecting angle", () => {
    expect(sectorCentroid({ inner: 100, outer: 300, from: -20, to: 20 })).toEqual(polar(200, 0));
  });
});

describe("halfMoonPath", () => {
  it("AC14: is a half ellipse whose flat edge is the back wall", () => {
    expect(halfMoonPath(500, 28, 150)).toBe("M 350 28 A 150 150 0 0 0 650 28 Z");
    expect(halfMoonPath(500, 28, 150, 60)).toBe("M 350 28 A 150 60 0 0 0 650 28 Z");
  });
});

describe("venue layouts", () => {
  for (const layout of Object.values(VENUE_LAYOUTS)) {
    it(`AC14: every ${layout.id} zone wraps the stage without overlapping it and fits the map`, () => {
      const height = mapHeight(
        layout.zones.map((z) => z.arc),
        layout.stageRadius,
      );
      for (const { arc } of layout.zones) {
        expect(arc.inner).toBeGreaterThan(layout.stageRadius);
        for (const angle of [arc.from, arc.to, (arc.from + arc.to) / 2]) {
          const p = polar(arc.outer, angle);
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.x).toBeLessThanOrEqual(MAP_WIDTH);
          expect(p.y).toBeLessThanOrEqual(height);
        }
      }
    });
  }
});
