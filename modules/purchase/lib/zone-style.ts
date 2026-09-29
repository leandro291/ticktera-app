import type { ZoneTier } from "../types/venue";

const SOLD_OUT = { fill: "#e4e4e7", text: "#52525b", swatch: "#d4d4d8" };

export const zoneSwatch = (tier: ZoneTier) => (tier.status === "sold-out" ? SOLD_OUT.swatch : tier.color);

export const zoneColors = (tier: ZoneTier) =>
  tier.status === "sold-out" ? { background: SOLD_OUT.fill, color: SOLD_OUT.text } : { background: tier.color, color: tier.textColor };
