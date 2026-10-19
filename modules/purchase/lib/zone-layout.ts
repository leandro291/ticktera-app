import type { VenueLayout } from "../types/venue";

const STAGE_RADIUS = 150;
const FIRST_INNER = 168;
const LAST_OUTER = 480; // 480·sin(80°) ≈ 473 < 500: el anillo exterior entra en el mapa de 1000 de ancho
const GAP = 12;
const ARC = { from: -80, to: 80 };
const SHORT_NAME_MAX = 14;

// De la zona más cercana al escenario a la más lejana; desde la sexta se repite el tono más claro.
const PALETTE = [
  { color: "#312e81", textColor: "#ffffff" },
  { color: "#4f46e5", textColor: "#ffffff" },
  { color: "#818cf8", textColor: "#1e1b4b" },
  { color: "#a5b4fc", textColor: "#1e1b4b" },
  { color: "#c7d2fe", textColor: "#1e1b4b" },
];

const shortName = (name: string) => (name.length > SHORT_NAME_MAX ? `${name.slice(0, SHORT_NAME_MAX - 1).trimEnd()}…` : name);

/** D9: mapa de zonas automático. Anillos concéntricos alrededor del escenario en el orden recibido (sort_order). */
export function buildZoneLayout(tiers: { id: string; name: string }[]): VenueLayout {
  const band = (LAST_OUTER - FIRST_INNER - GAP * Math.max(0, tiers.length - 1)) / Math.max(1, tiers.length);
  return {
    stageRadius: STAGE_RADIUS,
    zones: tiers.map((tier, i) => {
      const inner = FIRST_INNER + i * (band + GAP);
      return {
        id: tier.id,
        name: tier.name,
        shortName: shortName(tier.name),
        arc: { inner: Math.round(inner), outer: Math.round(inner + band), ...ARC },
        ...PALETTE[Math.min(i, PALETTE.length - 1)],
      };
    }),
  };
}
