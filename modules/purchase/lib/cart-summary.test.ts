import { describe, expect, it } from "vitest";
import type { ZoneTier } from "../types/venue";
import { formatTicketCount, getCartSummary } from "./cart-summary";
import { buildZoneLayout } from "./zone-layout";

const layout = buildZoneLayout([
  { id: "vip", name: "VIP" },
  { id: "general", name: "General" },
]);
const tiers: ZoneTier[] = layout.zones.map((zone, i) => ({ ...zone, price: [450, 250][i], status: "available", available: 100, maxPerOrder: 6 }));

describe("getCartSummary", () => {
  it("AC9: un carrito vacío no tiene ítems y suma 0", () => {
    expect(getCartSummary([], tiers)).toEqual({ items: [], total: 0, count: 0 });
  });

  it("AC9: suma por zona en el orden del mapa e ignora zonas desconocidas", () => {
    const summary = getCartSummary(
      [
        { zoneId: "general", quantity: 2 },
        { zoneId: "vip", quantity: 1 },
        { zoneId: "ya-no-existe", quantity: 3 },
      ],
      tiers,
    );
    expect(summary.items.map((i) => i.tier.name)).toEqual(["VIP", "General"]);
    expect(summary.total).toBe(450 + 2 * 250);
    expect(summary.count).toBe(3);
  });
});

describe("formatTicketCount", () => {
  it("AC9: singular y plural", () => {
    expect(formatTicketCount(1)).toBe("1 entrada");
    expect(formatTicketCount(3)).toBe("3 entradas");
  });
});
