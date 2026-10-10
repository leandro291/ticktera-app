import { describe, expect, it } from "vitest";
import { limaDateTimeToDate } from "./lima-datetime";

describe("limaDateTimeToDate", () => {
  it("AC11: interpreta fecha y hora en Lima (-05:00)", () => {
    expect(limaDateTimeToDate("2026-11-14", "21:00")?.toISOString()).toBe("2026-11-15T02:00:00.000Z");
    expect(limaDateTimeToDate("2026-01-01", "00:00")?.toISOString()).toBe("2026-01-01T05:00:00.000Z");
  });

  it("AC11: rechaza fechas imposibles", () => {
    expect(limaDateTimeToDate("2026-02-30", "21:00")).toBeNull();
    expect(limaDateTimeToDate("2026-13-01", "21:00")).toBeNull();
    expect(limaDateTimeToDate("2025-02-29", "10:00")).toBeNull();
    expect(limaDateTimeToDate("2028-02-29", "10:00")).not.toBeNull(); // bisiesto
  });

  it("AC11: rechaza formatos inválidos", () => {
    expect(limaDateTimeToDate("2026-11-14", "24:00")).toBeNull();
    expect(limaDateTimeToDate("2026-11-14", "9:00")).toBeNull();
    expect(limaDateTimeToDate("2026-11-14", "")).toBeNull();
    expect(limaDateTimeToDate("", "21:00")).toBeNull();
    expect(limaDateTimeToDate("14/11/2026", "21:00")).toBeNull();
  });
});
