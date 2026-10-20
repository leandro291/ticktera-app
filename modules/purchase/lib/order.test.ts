import { describe, expect, it } from "vitest";
import { formatOrderSeats } from "./order";

describe("formatOrderSeats", () => {
  it("AC9: groups seats by row", () => {
    expect(formatOrderSeats([{ row: "D", number: 4 }, { row: "C", number: 13 }, { row: "C", number: 12 }])).toBe("Fila C · 12, 13 · Fila D · 4");
  });
});
