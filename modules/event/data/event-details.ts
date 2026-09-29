import type { EventDetail, EventSummary } from "../types/event";

type DetailFields = Omit<EventDetail, keyof EventSummary>;

// Mock detail fields, keyed by event id. Merged with `EVENTS` by the service.
export const EVENT_DETAILS: Record<string, DetailFields> = {
  "evt-001": {
    startTime: "21:00",
    doorsTime: "17:00",
    minAge: "Todo público",
    description:
      "Bad Bunny llega a Lima con su World Tour: más de dos horas de show con sus éxitos, un escenario 360° y producción de luces y pirotecnia. La entrada incluye acceso a la zona elegida y a las áreas de comida del estadio.",
    address: "Av. José Díaz s/n, Cercado de Lima",
    venueLayoutId: "stadium",
  },
  "evt-002": {
    startTime: "14:00",
    doorsTime: "12:00",
    minAge: "+18",
    description:
      "Un día completo de rock y música latina frente al mar, con más de 20 bandas en tres escenarios. Incluye zona de food trucks y áreas de descanso.",
    address: "Circuito de Playas, Costa Verde, Magdalena del Mar",
    venueLayoutId: "stadium",
  },
  "evt-003": {
    startTime: "20:00",
    doorsTime: "17:30",
    minAge: "Todo público",
    description: "El clásico del fútbol peruano. Vive la rivalidad más grande del país desde las tribunas del Monumental.",
    address: "Av. Javier Prado Este s/n, Ate",
    venueLayoutId: "stadium",
  },
  "evt-004": {
    startTime: "19:30",
    doorsTime: "19:00",
    minAge: "+12",
    description:
      "La tragedia de Shakespeare en una puesta contemporánea de la Compañía Nacional de Teatro. Duración aproximada: 2 horas con intermedio.",
    address: "Calle Mercaderes 239, Arequipa",
    venueLayoutId: "theater",
  },
  "evt-005": {
    startTime: "10:00",
    doorsTime: "09:30",
    minAge: "Todo público",
    description: "Juegos, talleres, cuentacuentos y música para toda la familia al aire libre. Los niños menores de 3 años no pagan entrada.",
    address: "Av. Selva Alegre s/n, Arequipa",
    venueLayoutId: "stadium",
  },
  "evt-006": {
    startTime: "21:00",
    doorsTime: "18:00",
    minAge: "Todo público",
    description: "Coldplay presenta Music of the Spheres, su gira más ambiciosa, con pulseras LED para todo el público y un show pensado para ser sostenible.",
    address: "Av. de Concha Espina 1, Madrid",
    venueLayoutId: "stadium",
  },
  "evt-007": {
    startTime: "19:00",
    doorsTime: "17:30",
    minAge: "Todo público",
    description: "Dos equipos de la NBA se enfrentan en un partido de exhibición con concurso de clavadas y show de medio tiempo.",
    address: "Av. Rio Consulado 4234, Ciudad de México",
    venueLayoutId: "stadium",
  },
  "evt-008": {
    startTime: "16:00",
    doorsTime: "15:00",
    minAge: "+18",
    description: "Los mejores DJs de la escena electrónica mundial en un festival de 10 horas junto al mar.",
    address: "Circuito de Playas, Costa Verde, Chorrillos",
    venueLayoutId: "stadium",
  },
  "evt-009": {
    startTime: "20:00",
    doorsTime: "19:15",
    minAge: "+6",
    description: "La Orquesta Sinfónica Nacional despide el año con valses, polkas y la Novena de Beethoven.",
    address: "Av. Javier Prado Este 2225, San Borja, Lima",
    venueLayoutId: "theater",
  },
  "evt-010": {
    startTime: "16:00",
    doorsTime: "15:00",
    minAge: "Todo público",
    description: "Acróbatas, payasos y malabaristas en un espectáculo de dos horas para grandes y chicos.",
    address: "Av. Javier Prado Este 4200, Santiago de Surco",
    venueLayoutId: "stadium",
  },
};
