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
