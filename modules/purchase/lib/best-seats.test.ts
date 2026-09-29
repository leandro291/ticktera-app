import { describe, expect, it } from "vitest";
import type { SeatSection } from "../types/venue";
import { pickBestSeats } from "./best-seats";
import { buildSeatSection, SEAT_R } from "./seat-layout";

/** 3 rows × 10 seats (aisle after seat 8), every seat free unless listed as "A-3" etc. */
function section(taken: string[] = [], curve = 0): SeatSection {
  const base = buildSeatSection("test", "z", { rows: 3, seatsPerRow: 10 }, "available", curve);
  return { ...base, seats: base.seats.map((s) => ({ ...s, taken: taken.includes(`${s.row}-${s.number}`) })) };
}
const ids = (...names: string[]) => names.map((n) => `z-${n}`);

describe("buildSeatSection", () => {
  it("AC15: straight rows share a y; the aisle widens the gap between seats 8 and 9", () => {
    const s = section();
    const rowA = s.seats.filter((x) => x.row === "A");
    expect(new Set(rowA.map((x) => x.cy)).size).toBe(1);
    const gap = (a: number, b: number) => rowA[b - 1].cx - rowA[a - 1].cx;
    expect(gap(8, 9)).toBeGreaterThan(gap(7, 8));
  });

  it("AC15: curved rows bend their edges towards the stage and every seat fits below it", () => {
    const s = section([], 0.6);
    const rowA = s.seats.filter((x) => x.row === "A");
    const middle = rowA[4];
    expect(rowA[0].cy).toBeLessThan(middle.cy);
    expect(rowA[9].cy).toBeLessThan(middle.cy);
    for (const seat of s.seats) {
      expect(seat.cy - SEAT_R).toBeGreaterThan(s.stage.y + s.stage.height);
      expect(seat.cx + SEAT_R).toBeLessThanOrEqual(s.width);
    }
  });
});

describe("pickBestSeats", () => {
  it("AC16: takes adjacent seats in the front row, as centred as possible", () => {
    // Row A centre is between seats 5 and 6.
    expect(pickBestSeats(section(), 2)).toEqual({ seatIds: ids("A-5", "A-6"), contiguous: true });
  });

  it("AC16: skips taken seats and never pairs seats across the aisle", () => {
    const taken = ["A-1", "A-2", "A-3", "A-4", "A-5", "A-6", "A-7", "A-10"];
    // A-8 and A-9 are free but split by the aisle, so row B wins.
    expect(pickBestSeats(section(taken), 2).seatIds).toEqual(ids("B-5", "B-6"));
  });

  it("AC16: moves back a row when the front one has no room", () => {
    const taken = ["A-2", "A-4", "A-6", "A-8", "A-10"];
    expect(pickBestSeats(section(taken), 2).seatIds[0]).toMatch(/^z-B-/);
  });

  it("AC16: seats the buyer already holds count as free", () => {
    const s = section(["A-5", "A-6"]);
    expect(pickBestSeats(s, 2, ids("A-5", "A-6")).seatIds).toEqual(ids("A-5", "A-6"));
  });

  it("AC16: completes with the nearest free seats when nothing is adjacent", () => {
    const taken = section()
      .seats.filter((s) => s.number % 2 === 0)
      .map((s) => `${s.row}-${s.number}`);
    const result = pickBestSeats(section(taken), 3);
    expect(result.contiguous).toBe(false);
    expect(result.seatIds).toHaveLength(3);
    expect(result.seatIds).toContain("z-A-5");
  });

  it("AC16: returns fewer seats only when the zone has fewer free", () => {
    const all = section().seats.map((s) => `${s.row}-${s.number}`);
    expect(pickBestSeats(section(all.slice(1)), 4).seatIds).toEqual(ids("A-1"));
    expect(pickBestSeats(section(), 0).seatIds).toEqual([]);
  });
});
