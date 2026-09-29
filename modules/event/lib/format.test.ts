import { describe, expect, it } from "vitest";
import { formatDateLong, formatDateShort, formatPrice, getDateBadge } from "./format";

describe("formatPrice", () => {
  it("AC1: formats soles with the design symbol and es-PE grouping", () => {
    expect(formatPrice(250)).toBe("S/ 250");
    expect(formatPrice(1250, "PEN")).toBe("S/ 1,250");
  });

  it("AC1: uses the event currency for international events", () => {
    expect(formatPrice(150, "USD")).toBe("US$ 150");
    expect(formatPrice(300, "EUR")).toBe("€ 300");
  });
});

describe("dates", () => {
  it("AC1: short date matches the design (sáb 14 nov)", () => {
    expect(formatDateShort("2026-11-14")).toBe("sáb 14 nov");
    expect(formatDateShort("2026-10-05")).toBe("lun 5 oct");
  });

  it("AC1: long date matches the design", () => {
    expect(formatDateLong("2026-11-14")).toBe("sábado 14 de noviembre");
  });

  it("AC1: calendar badge uses zero-padded day and uppercase month", () => {
    expect(getDateBadge("2026-10-05")).toEqual({ day: "05", month: "OCT" });
    expect(getDateBadge("2026-12-31")).toEqual({ day: "31", month: "DIC" });
  });
});
