import { describe, expect, it } from "vitest";
import type { Seat, SeatSection } from "../types/venue";
import { pickBestSeats } from "./best-seats";
import { SEAT_PITCH } from "./seat-layout";

/** Synthetic 3 rows × 10 seats (aisle after seat 8); seats listed as "A-3" etc. are taken. */
function section(taken: string[] = []): SeatSection {
  const seats: Seat[] = [];
  for (const [r, row] of ["A", "B", "C"].entries()) {
    for (let n = 1; n <= 10; n++) {
      seats.push({ id: `z-${row}-${n}`, row, number: n, cx: n * SEAT_PITCH + (n > 8 ? 26 : 0), cy: r * 30, taken: taken.includes(`${row}-${n}`) });
    }
  }
  const rows = ["A", "B", "C"].map((label) => ({ label, start: { x: 0, y: 0 }, end: { x: 0, y: 0 } }));
  return { zoneId: "z", width: 400, height: 120, stage: { cx: 0, cy: 0, r: 0 }, outline: "", neighbors: [], focus: { x: 0, y: 0, width: 0, height: 0 }, anchor: { x: 0, y: 0 }, rows, seats };
}
const ids = (...names: string[]) => names.map((n) => `z-${n}`);

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
