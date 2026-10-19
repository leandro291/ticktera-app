import { describe, expect, it } from "vitest";
import { formatDateLong, formatDateShort, formatPrice, formatPriceCents, getDateBadge, isoToLimaDate, isoToLimaTime } from "./format";

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

describe("formatPriceCents", () => {
  it("AC11: converts cents to soles", () => {
    expect(formatPriceCents(0)).toBe("S/ 0");
    expect(formatPriceCents(12345)).toBe("S/ 123");
    expect(formatPriceCents(123456789012)).toBe("S/ 1,234,567,890");
  });
});

describe("isoToLimaDate", () => {
  it("AC11: returns the Lima calendar day, not the UTC one", () => {
    expect(isoToLimaDate("2026-11-14T21:00:00-05:00")).toBe("2026-11-14");
    expect(isoToLimaDate("2026-11-15T02:00:00Z")).toBe("2026-11-14");
    expect(isoToLimaDate("2026-11-15T05:00:00Z")).toBe("2026-11-15");
  });
});

describe("isoToLimaTime", () => {
  it("AC11 (event-crud): hora 24 h en Lima, medianoche 00:00", () => {
    expect(isoToLimaTime("2026-11-15T02:00:00Z")).toBe("21:00");
    expect(isoToLimaTime("2026-11-15T05:00:00Z")).toBe("00:00");
    expect(isoToLimaTime("2026-11-15T14:35:00-05:00")).toBe("14:35");
  });
});
