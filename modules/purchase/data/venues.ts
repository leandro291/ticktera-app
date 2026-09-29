import type { AvailabilityStatus } from "@/modules/event";
import type { VenueLayout } from "../types/venue";

export const MAX_TICKETS_PER_ZONE = 6;

// Map geometry in percent. Mirrors the "Elige tu zona" grid of the design.
export const VENUE_LAYOUTS: Record<VenueLayout["id"], VenueLayout> = {
  stadium: {
    id: "stadium",
    stage: { x: 23.5, y: 0, width: 53, height: 12 },
    zones: [
      { id: "vip", name: "Campo VIP", shortName: "Campo VIP", kind: "general-admission", shape: { x: 23.5, y: 13.5, width: 53, height: 27 }, color: "#312e81", textColor: "#ffffff", priceFactor: 2.76 },
      { id: "general", name: "Campo General", shortName: "Campo General", kind: "general-admission", shape: { x: 23.5, y: 42, width: 53, height: 33 }, color: "#4f46e5", textColor: "#ffffff", priceFactor: 1.8 },
      { id: "occidente", name: "Tribuna Occidente", shortName: "Occidente", kind: "numbered", shape: { x: 0, y: 0, width: 22, height: 75 }, color: "#818cf8", textColor: "#1e1b4b", priceFactor: 1.52, seating: { rows: 12, seatsPerRow: 24 } },
      { id: "oriente", name: "Tribuna Oriente", shortName: "Oriente", kind: "numbered", shape: { x: 78, y: 0, width: 22, height: 75 }, color: "#a5b4fc", textColor: "#1e1b4b", priceFactor: 1.28, seating: { rows: 12, seatsPerRow: 24 } },
      { id: "norte", name: "Tribuna Norte", shortName: "Tribuna Norte", kind: "numbered", shape: { x: 0, y: 76.5, width: 100, height: 23.5 }, color: "#c7d2fe", textColor: "#1e1b4b", priceFactor: 1, seating: { rows: 10, seatsPerRow: 32 } },
    ],
  },
  theater: {
    id: "theater",
    stage: { x: 15, y: 0, width: 70, height: 12 },
    zones: [
      { id: "platea", name: "Platea", shortName: "Platea", kind: "numbered", shape: { x: 15, y: 14, width: 70, height: 50 }, color: "#4f46e5", textColor: "#ffffff", priceFactor: 2, seating: { rows: 14, seatsPerRow: 20 } },
      { id: "palco-izquierdo", name: "Palco izquierdo", shortName: "Palco izq.", kind: "general-admission", shape: { x: 0, y: 14, width: 13, height: 50 }, color: "#818cf8", textColor: "#1e1b4b", priceFactor: 1.5 },
      { id: "palco-derecho", name: "Palco derecho", shortName: "Palco der.", kind: "general-admission", shape: { x: 87, y: 14, width: 13, height: 50 }, color: "#818cf8", textColor: "#1e1b4b", priceFactor: 1.5 },
      { id: "mezzanine", name: "Mezzanine", shortName: "Mezzanine", kind: "numbered", shape: { x: 0, y: 66, width: 100, height: 34 }, color: "#c7d2fe", textColor: "#1e1b4b", priceFactor: 1, seating: { rows: 8, seatsPerRow: 24 } },
    ],
  },
};

// Per-event availability overrides (mock). Zones not listed follow the event status.
export const ZONE_STATUS_OVERRIDES: Record<string, Record<string, AvailabilityStatus>> = {
  "evt-001": { vip: "sold-out", occidente: "last-tickets" },
  "evt-006": { vip: "sold-out", general: "last-tickets" },
  "evt-004": { "palco-derecho": "sold-out" },
};
