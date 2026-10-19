import { describe, expect, it } from "vitest";
import { eventStatus, priceFromCents, tierAvailable, tierStatus } from "./availability";

describe("tierAvailable", () => {
  it("AC1: capacidad menos pagadas y pendientes, nunca negativo", () => {
    expect(tierAvailable({ capacity: 100, paid: 30, reserved: 5 })).toBe(65);
    expect(tierAvailable({ capacity: 10, paid: 8, reserved: 4 })).toBe(0);
    expect(tierAvailable({ capacity: 0, paid: 0, reserved: 0 })).toBe(0);
  });
});

describe("tierStatus", () => {
  it("AC1: sin cupo → agotada", () => {
    expect(tierStatus({ capacity: 100, available: 0 })).toBe("sold-out");
  });

  it("AC1: umbral de 10 fijos en zonas chicas", () => {
    expect(tierStatus({ capacity: 50, available: 10 })).toBe("last-tickets");
    expect(tierStatus({ capacity: 50, available: 11 })).toBe("available");
  });

  it("AC1: umbral del 10 % en zonas grandes", () => {
    expect(tierStatus({ capacity: 1000, available: 100 })).toBe("last-tickets");
    expect(tierStatus({ capacity: 1000, available: 101 })).toBe("available");
  });
});

describe("eventStatus", () => {
  it("AC1: agotado solo si todas lo están; últimas si alguna; sin zonas = agotado", () => {
    expect(eventStatus([{ status: "sold-out" }, { status: "sold-out" }])).toBe("sold-out");
    expect(eventStatus([{ status: "sold-out" }, { status: "last-tickets" }])).toBe("last-tickets");
    expect(eventStatus([{ status: "available" }, { status: "sold-out" }])).toBe("available");
    expect(eventStatus([])).toBe("sold-out");
  });
});

describe("priceFromCents", () => {
  it("AC1: mínimo entre las zonas con cupo", () => {
    expect(priceFromCents([{ priceCents: 5000, available: 0 }, { priceCents: 8000, available: 3 }, { priceCents: 9000, available: 1 }])).toBe(8000);
  });

  it("AC1: todas agotadas → mínimo de todas; sin zonas → null", () => {
    expect(priceFromCents([{ priceCents: 5000, available: 0 }, { priceCents: 8000, available: 0 }])).toBe(5000);
    expect(priceFromCents([])).toBeNull();
  });
});
