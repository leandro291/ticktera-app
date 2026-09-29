import type { EventSummary, PriceRangeKey } from "../types/event";

const IMG = "/images/events";

// Mock catalog. Replaced by the API once the backend exists.
export const EVENTS: EventSummary[] = [
  { id: "evt-002", title: "Festival Vive Latino Lima", category: "Festivales", image: `${IMG}/vive-latino-lima.jpg`, imageAlt: "Confeti cayendo sobre la multitud frente al escenario durante un festival nocturno", date: "2026-10-05", venue: "Costa Verde", city: "Lima", currency: "PEN", priceFrom: 120, status: "last-tickets" },
  { id: "evt-007", title: "NBA Global Games — Exhibición de Básquet", category: "Deportes", image: `${IMG}/nba-global-games.jpg`, imageAlt: "Vista desde abajo de un aro de baloncesto con su red en una cancha techada", date: "2026-10-12", venue: "Arena CDMX", city: "Ciudad de México", currency: "USD", priceFrom: 150, status: "available" },
  { id: "evt-003", title: "Clásico Peruano: Universitario vs. Alianza Lima", category: "Deportes", image: `${IMG}/clasico-peruano.jpg`, imageAlt: "Vista aérea de un estadio de fútbol lleno de espectadores durante un partido", date: "2026-10-20", venue: "Estadio Monumental", city: "Lima", currency: "PEN", priceFrom: 80, status: "sold-out" },
  { id: "evt-004", title: "Romeo y Julieta — Obra de Teatro", category: "Teatro", image: `${IMG}/romeo-y-julieta.jpg`, imageAlt: "Siluetas de tres actores sobre el escenario frente a un telón rojo", date: "2026-11-02", venue: "Teatro Municipal de Arequipa", city: "Arequipa", currency: "PEN", priceFrom: 60, status: "available" },
  { id: "evt-001", title: "Bad Bunny — World Tour", category: "Conciertos", image: `${IMG}/bad-bunny-world-tour.jpg`, imageAlt: "Multitud con los brazos en alto frente a un escenario iluminado durante un concierto nocturno", date: "2026-11-14", venue: "Estadio Nacional", city: "Lima", currency: "PEN", priceFrom: 250, status: "available" },
  { id: "evt-010", title: "Circo de las Estrellas", category: "Familiar", image: `${IMG}/circo-de-las-estrellas.jpg`, imageAlt: "Niños jugando con una pelota en un parque arbolado", date: "2026-11-22", venue: "Explanada Jockey Plaza", city: "Lima", currency: "PEN", priceFrom: 45, status: "available" },
  { id: "evt-006", title: "Coldplay — Music of the Spheres World Tour", category: "Conciertos", image: `${IMG}/coldplay-music-of-the-spheres.jpg`, imageAlt: "Silueta de un artista con la mano en alto sobre el escenario entre humo y luces azules y rojas", date: "2026-11-28", venue: "Estadio Santiago Bernabéu", city: "Madrid", currency: "EUR", priceFrom: 300, status: "last-tickets" },
  { id: "evt-005", title: "Feria Familiar de Verano", category: "Familiar", image: `${IMG}/feria-familiar-verano.jpg`, imageAlt: "Dos niñas compartiendo la lectura de un libro al aire libre durante el atardecer", date: "2026-12-01", venue: "Parque Selva Alegre", city: "Arequipa", currency: "PEN", priceFrom: 40, status: "available" },
  { id: "evt-008", title: "Festival Electrónico Ultra Lima", category: "Festivales", image: `${IMG}/ultra-lima.jpg`, imageAlt: "Multitud con las manos en alto frente a un escenario con luces doradas durante un festival nocturno", date: "2026-12-20", venue: "Explanada Costa Verde", city: "Lima", currency: "PEN", priceFrom: 130, status: "last-tickets" },
  { id: "evt-009", title: "Concierto Sinfónico de Año Nuevo", category: "Conciertos", image: `${IMG}/sinfonico-ano-nuevo.jpg`, imageAlt: "Músicos de una orquesta tocando el violín durante un concierto", date: "2026-12-31", venue: "Gran Teatro Nacional", city: "Arequipa", currency: "PEN", priceFrom: 95, status: "available" },
];

export const FEATURED_EVENT_IDS = ["evt-001", "evt-002", "evt-004", "evt-005", "evt-007"];

export const CITIES = ["Lima", "Arequipa", "Ciudad de México", "Madrid"];

export const MONTH_OPTIONS = [
  { key: "any", label: "Cualquier fecha" },
  { key: "10", label: "Octubre" },
  { key: "11", label: "Noviembre" },
  { key: "12", label: "Diciembre" },
];

export const PRICE_RANGES: { key: PriceRangeKey; label: string; min: number; max: number }[] = [
  { key: "any", label: "Cualquier precio", min: -1, max: Infinity },
  { key: "u50", label: "Hasta S/ 50", min: -1, max: 50 },
  { key: "50", label: "S/ 50 – 150", min: 50, max: 150 },
  { key: "150", label: "S/ 150 – 300", min: 150, max: 300 },
  { key: "300", label: "Más de S/ 300", min: 300, max: Infinity },
];
