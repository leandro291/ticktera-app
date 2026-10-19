import type { Currency } from "../types/event";

const LOCALE = "es-PE";

const CURRENCY_SYMBOL: Record<Currency, string> = {
  PEN: "S/",
  USD: "US$",
  EUR: "€",
};

const numberFormat = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

export function formatPrice(amount: number, currency: Currency = "PEN"): string {
  return `${CURRENCY_SYMBOL[currency]} ${numberFormat.format(amount)}`;
}

/** Céntimos → soles (D6). */
export function formatPriceCents(cents: number): string {
  return formatPrice(cents / 100);
}

// en-CA formats as yyyy-mm-dd; Lima has no DST (D7).
const limaDate = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" });

/** ISO con zona → "yyyy-mm-dd" en hora de Lima. */
export function isoToLimaDate(iso: string): string {
  return limaDate.format(new Date(iso));
}

// h23: medianoche es "00:00" (no "24:00").
const limaTime = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** ISO con zona → "HH:mm" (24 h) en hora de Lima. */
export function isoToLimaTime(iso: string): string {
  return limaTime.format(new Date(iso));
}

const toDate = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`);

const part = (isoDate: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(LOCALE, { ...options, timeZone: "UTC" })
    .format(toDate(isoDate))
    .replace(".", "")
    .toLowerCase();

/** "sáb 14 nov" */
export function formatDateShort(isoDate: string): string {
  const weekday = part(isoDate, { weekday: "short" });
  const month = part(isoDate, { month: "short" });
  return `${weekday} ${toDate(isoDate).getUTCDate()} ${month}`;
}

/** "sábado 14 de noviembre" */
export function formatDateLong(isoDate: string): string {
  const weekday = part(isoDate, { weekday: "long" });
  const month = part(isoDate, { month: "long" });
  return `${weekday} ${toDate(isoDate).getUTCDate()} de ${month}`;
}

/** Calendar badge: { day: "05", month: "OCT" } */
export function getDateBadge(isoDate: string): { day: string; month: string } {
  return {
    day: isoDate.slice(8, 10),
    month: part(isoDate, { month: "short" }).toUpperCase(),
  };
}
