import { describe, expect, it } from "vitest";
import { buildZoneLayout } from "./zone-layout";

const tiers = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `t${i}`, name: `Zona ${i + 1}` }));

describe("buildZoneLayout", () => {
  it("AC3: de 1 a 10 zonas, anillos en orden, fuera del escenario y sin superponerse", () => {
    for (let n = 1; n <= 10; n++) {
      const { stageRadius, zones } = buildZoneLayout(tiers(n));
      expect(zones.map((z) => z.id)).toEqual(tiers(n).map((t) => t.id));
      expect(zones[0].arc.inner).toBeGreaterThan(stageRadius);
      zones.forEach((z, i) => {
        expect(z.arc.outer).toBeGreaterThan(z.arc.inner);
        if (i > 0) expect(z.arc.inner).toBeGreaterThan(zones[i - 1].arc.outer);
      });
    }
  });

  it("AC3: colores por posición; desde la sexta repite el más claro", () => {
    const { zones } = buildZoneLayout(tiers(7));
    expect(new Set(zones.slice(0, 5).map((z) => z.color)).size).toBe(5);
    expect(zones[6].color).toBe(zones[4].color);
    expect(zones.every((z) => z.textColor)).toBe(true);
  });

  it("AC3: nombre corto recortado", () => {
    const { zones } = buildZoneLayout([{ id: "a", name: "Tribuna Occidente Alta" }, { id: "b", name: "VIP" }]);
    expect(zones[0].shortName).toBe("Tribuna Occid…");
    expect(zones[1].shortName).toBe("VIP");
  });

  it("AC3: sin zonas → layout vacío", () => {
    expect(buildZoneLayout([]).zones).toEqual([]);
  });
});
