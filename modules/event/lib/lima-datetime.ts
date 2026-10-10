import { isoToLimaDate } from "./format";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Fecha y hora de Lima (UTC-5, sin DST) → instante. La zona del navegador no interviene.
 * null si el formato es inválido o la fecha no existe ("2026-02-30").
 */
export function limaDateTimeToDate(date: string, time: string): Date | null {
  if (!DATE.test(date) || !TIME.test(time)) return null;
  const instant = new Date(`${date}T${time}:00-05:00`);
  if (Number.isNaN(instant.getTime())) return null;
  // Ida y vuelta: algunos motores desbordan "02-30" a marzo en vez de rechazarlo.
  return isoToLimaDate(instant.toISOString()) === date ? instant : null;
}
