import type { OrganizerEvent } from "../types/organizer-event";

const IMG = "/images/events";

// Mock events of the demo organizer (the design's sample rows). Replaced by the API once the backend exists.
export const ORGANIZER_EVENTS: OrganizerEvent[] = [
  {
    id: "org-001",
    catalogId: "evt-002",
    title: "Festival Vive Latino Lima",
    category: "Festivales",
    description: "Dos escenarios, más de 20 artistas y zona de comida en la Costa Verde.",
    image: `${IMG}/vive-latino-lima.jpg`,
    date: "2026-10-05",
    startTime: "14:00",
    venue: "Costa Verde",
    city: "Lima",
    status: "published",
    tiers: [
      { id: "org-001-general", name: "General", price: 120, capacity: 6500, sold: 6120 },
      { id: "org-001-vip", name: "VIP", price: 280, capacity: 1500, sold: 1300 },
    ],
  },
  {
    id: "org-002",
    catalogId: "evt-004",
    title: "Romeo y Julieta — Obra de Teatro",
    category: "Teatro",
    description: "El clásico de Shakespeare en una puesta contemporánea.",
    image: `${IMG}/romeo-y-julieta.jpg`,
    date: "2026-11-02",
    startTime: "20:00",
    venue: "Teatro Municipal de Arequipa",
    city: "Arequipa",
    status: "published",
    tiers: [
      { id: "org-002-platea", name: "Platea", price: 90, capacity: 240, sold: 200 },
      { id: "org-002-mezzanine", name: "Mezzanine", price: 60, capacity: 180, sold: 112 },
    ],
  },
  {
    id: "org-003",
    catalogId: "evt-010",
    title: "Circo de las Estrellas",
    category: "Familiar",
    description: "Acróbatas, payasos y malabaristas para toda la familia.",
    image: `${IMG}/circo-de-las-estrellas.jpg`,
    date: "2026-11-22",
    startTime: "16:00",
    venue: "Explanada Jockey Plaza",
    city: "Lima",
    status: "published",
    tiers: [
      { id: "org-003-general", name: "General", price: 45, capacity: 1000, sold: 360 },
      { id: "org-003-preferencial", name: "Preferencial", price: 80, capacity: 200, sold: 54 },
    ],
  },
  {
    id: "org-004",
    title: "Feria Familiar de Verano",
    category: "Familiar",
    description: "Juegos, talleres y cuentacuentos al aire libre.",
    image: `${IMG}/feria-familiar-verano.jpg`,
    date: "2026-12-01",
    startTime: "10:00",
    venue: "Parque Selva Alegre",
    city: "Arequipa",
    status: "draft",
    tiers: [{ id: "org-004-general", name: "General", price: 40, capacity: 1500, sold: 0 }],
  },
];
