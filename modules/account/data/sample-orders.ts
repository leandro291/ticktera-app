import type { Order } from "@/modules/purchase";

// Mock orders of the signed-in account (same as the design), shown next to the ones paid in this session.
export const SAMPLE_ORDERS: Order[] = [
  {
    code: "TK-24817",
    event: {
      id: "evt-001",
      title: "Bad Bunny — World Tour",
      category: "Conciertos",
      image: "/images/events/bad-bunny-world-tour.jpg",
      date: "2026-11-14",
      startTime: "21:00",
      venue: "Estadio Nacional",
      city: "Lima",
    },
    currency: "PEN",
    items: [{ zoneName: "Campo General", quantity: 2, seats: [], amount: 900 }],
    total: 900,
    count: 2,
    buyerName: "Ana Pérez",
    email: "ana.perez@mail.com",
    paymentMethod: "card",
  },
  {
    code: "TK-24790",
    event: {
      id: "evt-004",
      title: "Romeo y Julieta — Obra de Teatro",
      category: "Teatro",
      image: "/images/events/romeo-y-julieta.jpg",
      date: "2026-11-02",
      startTime: "19:30",
      venue: "Teatro Municipal de Arequipa",
      city: "Arequipa",
    },
    currency: "PEN",
    items: [{ zoneName: "Platea", quantity: 1, seats: [{ row: "D", number: 8 }], amount: 120 }],
    total: 120,
    count: 1,
    buyerName: "Ana Pérez",
    email: "ana.perez@mail.com",
    paymentMethod: "yape",
  },
];
