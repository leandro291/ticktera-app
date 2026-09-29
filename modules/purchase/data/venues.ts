import type { AvailabilityStatus } from "@/modules/event";
import type { VenueLayout } from "../types/venue";

export const MAX_TICKETS_PER_ZONE = 6;

// Venue maps: zones are ring sectors around a half-moon stage (see ZoneArc; the map is 1000 units wide).
export const VENUE_LAYOUTS: Record<VenueLayout["id"], VenueLayout> = {
  stadium: {
    id: "stadium",
    stageRadius: 150,
    zones: [
      { id: "vip", name: "Campo VIP", shortName: "Campo VIP", kind: "general-admission", arc: { inner: 168, outer: 282, from: -46, to: 46 }, color: "#312e81", textColor: "#ffffff", priceFactor: 2.76 },
      { id: "general", name: "Campo General", shortName: "Campo General", kind: "general-admission", arc: { inner: 294, outer: 420, from: -46, to: 46 }, color: "#4f46e5", textColor: "#ffffff", priceFactor: 1.8 },
      { id: "occidente", name: "Tribuna Occidente", shortName: "Occidente", kind: "numbered", arc: { inner: 168, outer: 420, from: -89, to: -50 }, color: "#818cf8", textColor: "#1e1b4b", priceFactor: 1.52, seating: { rows: 12, seatsPerRow: 24 } },
      { id: "oriente", name: "Tribuna Oriente", shortName: "Oriente", kind: "numbered", arc: { inner: 168, outer: 420, from: 50, to: 89 }, color: "#a5b4fc", textColor: "#1e1b4b", priceFactor: 1.28, seating: { rows: 12, seatsPerRow: 24 } },
      { id: "norte", name: "Tribuna Norte", shortName: "Tribuna Norte", kind: "numbered", arc: { inner: 434, outer: 540, from: -62, to: 62 }, color: "#c7d2fe", textColor: "#1e1b4b", priceFactor: 1, seating: { rows: 10, seatsPerRow: 32 } },
    ],
  },
  theater: {
    id: "theater",
    stageRadius: 150,
    seatCurve: 0.35,
    zones: [
      { id: "platea", name: "Platea", shortName: "Platea", kind: "numbered", arc: { inner: 168, outer: 352, from: -52, to: 52 }, color: "#4f46e5", textColor: "#ffffff", priceFactor: 2, seating: { rows: 14, seatsPerRow: 20 } },
      { id: "palco-izquierdo", name: "Palco izquierdo", shortName: "Palco izq.", kind: "general-admission", arc: { inner: 168, outer: 352, from: -89, to: -56 }, color: "#818cf8", textColor: "#1e1b4b", priceFactor: 1.5 },
      { id: "palco-derecho", name: "Palco derecho", shortName: "Palco der.", kind: "general-admission", arc: { inner: 168, outer: 352, from: 56, to: 89 }, color: "#818cf8", textColor: "#1e1b4b", priceFactor: 1.5 },
      { id: "mezzanine", name: "Mezzanine", shortName: "Mezzanine", kind: "numbered", arc: { inner: 366, outer: 500, from: -72, to: 72 }, color: "#c7d2fe", textColor: "#1e1b4b", priceFactor: 1, seating: { rows: 8, seatsPerRow: 24 } },
    ],
  },
};

// Per-event availability overrides (mock). Zones not listed follow the event status.
export const ZONE_STATUS_OVERRIDES: Record<string, Record<string, AvailabilityStatus>> = {
  "evt-001": { vip: "sold-out", occidente: "last-tickets" },
  "evt-006": { vip: "sold-out", general: "last-tickets" },
  "evt-004": { "palco-derecho": "sold-out" },
};
