/** Límites del CRUD de eventos (D21). Moneda: solo PEN, montos en céntimos. */
export const EVENT_LIMITS = {
  titleMax: 120,
  descriptionMax: 5000,
  venueMax: 120,
  addressMax: 200,
  cityMax: 80,
  tierNameMax: 60,
  maxTiers: 10,
  maxPriceCents: 1_000_000, // S/ 10 000
  maxCapacity: 100_000,
  maxPerOrderLimit: 20,
  defaultMaxPerOrder: 6, // = MAX_TICKETS_PER_ZONE del seed (no se importa de purchase)
  maxEventsPerOrganizer: 200,
  coverMaxBytes: 2 * 1024 * 1024,
} as const;
