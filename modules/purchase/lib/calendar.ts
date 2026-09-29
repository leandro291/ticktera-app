import { saveFile } from "@/lib/download";
import type { Order } from "../types/order";

const pad = (n: number) => String(n).padStart(2, "0");
const escapeText = (text: string) => text.replace(/[\\,;]/g, (m) => `\\${m}`);
/** Events without an end time are booked for 3 hours. */
const DURATION_HOURS = 3;

const compactDate = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;

/** Start/end lines: timed (floating local time) when the order knows the start time, all-day otherwise. */
function eventTimes(date: string, startTime?: string): string[] {
  const match = startTime?.match(/^(\d{1,2}):(\d{2})/);
  if (match) {
    const start = new Date(`${date}T00:00:00Z`);
    start.setUTCHours(Number(match[1]), Number(match[2]));
    const end = new Date(start.getTime() + DURATION_HOURS * 3_600_000);
    const stamp = (d: Date) => `${compactDate(d)}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00`;
    return [`DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`];
  }
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return [`DTSTART;VALUE=DATE:${date.replaceAll("-", "")}`, `DTEND;VALUE=DATE:${compactDate(next)}`];
}

/** iCalendar event for an order, so buyers can add it to their calendar. */
export function buildOrderIcs(order: Order, now = new Date()): string {
  const stamp = `${compactDate(now)}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ticketera//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${order.code}@ticketera`,
    `DTSTAMP:${stamp}`,
    ...eventTimes(order.event.date, order.event.startTime),
    `SUMMARY:${escapeText(order.event.title)}`,
    `LOCATION:${escapeText(`${order.event.venue}, ${order.event.city}`)}`,
    `DESCRIPTION:${escapeText(`Pedido ${order.code} · ${order.count} entrada(s)`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

/** Browser-only: saves the order as `<code>.ics`. */
export function downloadOrderIcs(order: Order) {
  saveFile(new Blob([buildOrderIcs(order)], { type: "text/calendar;charset=utf-8" }), `${order.code}.ics`);
}
