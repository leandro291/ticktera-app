import type { Order } from "../types/order";

const pad = (n: number) => String(n).padStart(2, "0");
const escapeText = (text: string) => text.replace(/[\\,;]/g, (m) => `\\${m}`);

/** All-day iCalendar event for an order, so buyers can add it to their calendar. */
export function buildOrderIcs(order: Order): string {
  const start = order.event.date.replaceAll("-", "");
  const next = new Date(`${order.event.date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const end = `${next.getUTCFullYear()}${pad(next.getUTCMonth() + 1)}${pad(next.getUTCDate())}`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ticketera//ES",
    "BEGIN:VEVENT",
    `UID:${order.code}@ticketera`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${escapeText(order.event.title)}`,
    `LOCATION:${escapeText(`${order.event.venue}, ${order.event.city}`)}`,
    `DESCRIPTION:${escapeText(`Pedido ${order.code} · ${order.count} entrada(s)`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Browser-only: saves the order as `<code>.ics`. */
export function downloadOrderIcs(order: Order) {
  const url = URL.createObjectURL(new Blob([buildOrderIcs(order)], { type: "text/calendar" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: `${order.code}.ics` });
  link.click();
  URL.revokeObjectURL(url);
}
