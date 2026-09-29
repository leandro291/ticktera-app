import type { jsPDF } from "jspdf";
import { QR_SIZE, qrCells } from "@/components/shared/decorative-qr";
import { saveFile } from "@/lib/download";
import { formatDateLong } from "@/modules/event";
import type { Order } from "../types/order";
import { getOrderTickets, type OrderTicket } from "./order";

// Design tokens (jsPDF needs raw RGB).
const PRIMARY: [number, number, number] = [79, 70, 229];
const STRONG: [number, number, number] = [24, 24, 27];
const MUTED: [number, number, number] = [82, 82, 91];
const BORDER: [number, number, number] = [228, 228, 231];
const CANVAS: [number, number, number] = [244, 244, 245];

// A4 in millimetres, one ticket per page.
const PAGE_W = 210;
const X = 20;
const W = PAGE_W - X * 2;
const COVER_H = 58;

/** Loads the event image cropped to the ticket's cover ratio (object-cover), or null if it can't be read. */
async function loadCover(src: string): Promise<string | null> {
  if (!src) return null;
  try {
    const img = new Image();
    img.src = src;
    await img.decode();
    const ratio = W / COVER_H;
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = Math.round(1200 / ratio);
    const sw = Math.min(img.naturalWidth, img.naturalHeight * ratio);
    const sh = sw / ratio;
    canvas.getContext("2d")?.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } catch {
    return null;
  }
}

function drawQr(doc: jsPDF, seed: string, x: number, y: number, size: number) {
  const cell = size / QR_SIZE;
  doc.setFillColor(...STRONG);
  qrCells(seed).forEach((on, i) => {
    // Slight overlap hides hairline seams between cells in PDF viewers.
    if (on) doc.rect(x + (i % QR_SIZE) * cell, y + Math.floor(i / QR_SIZE) * cell, cell + 0.08, cell + 0.08, "F");
  });
}

function fact(doc: jsPDF, label: string, value: string, x: number, y: number, maxWidth: number) {
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...MUTED).text(label.toUpperCase(), x, y);
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...STRONG).text(doc.splitTextToSize(value, maxWidth), x, y + 5.5);
}

function drawTicket(doc: jsPDF, order: Order, ticket: OrderTicket, index: number, total: number, cover: string | null) {
  const { event } = order;
  let y = 20;

  // Brand bar
  doc.setFillColor(...PRIMARY).roundedRect(X, y, W, 14, 3, 3, "F");
  doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(255, 255, 255).text("Ticketera", X + 6, y + 9.2);
  doc.setFont("helvetica", "normal").setFontSize(10).text(`Entrada ${index + 1} de ${total}`, X + W - 6, y + 9.2, { align: "right" });
  y += 20;

  // Card
  const cardTop = y;
  const cardH = 214;
  doc.setDrawColor(...BORDER).setLineWidth(0.4).roundedRect(X, cardTop, W, cardH, 5, 5, "S");
  if (cover) doc.addImage(cover, "JPEG", X + 0.4, y + 0.4, W - 0.8, COVER_H, undefined, "FAST");
  else doc.setFillColor(...CANVAS).rect(X + 0.4, y + 0.4, W - 0.8, COVER_H, "F");
  y += COVER_H + 12;

  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...PRIMARY).text(event.category.toUpperCase(), X + 10, y);
  const title = doc.setFontSize(20).setTextColor(...STRONG).splitTextToSize(event.title, W - 20);
  doc.text(title, X + 10, y + 9);
  y += 9 + title.length * 8 + 4;

  const colW = (W - 20) / 3;
  fact(doc, "Fecha", formatDateLong(event.date), X + 10, y, colW - 4);
  fact(doc, "Hora", event.startTime ? `${event.startTime} h` : "Por confirmar", X + 10 + colW, y, colW - 4);
  fact(doc, "Lugar", `${event.venue}, ${event.city}`, X + 10 + colW * 2, y, colW - 4);
  y += 24;

  // Perforation with side notches
  doc.setLineDashPattern([2, 1.5], 0).setDrawColor(212, 212, 216).line(X + 6, y, X + W - 6, y).setLineDashPattern([], 0);
  doc.setFillColor(255, 255, 255).setDrawColor(...BORDER);
  doc.circle(X, y, 4, "FD").circle(X + W, y, 4, "FD");
  y += 12;

  // QR + ticket facts
  const qrSize = 58;
  doc.setDrawColor(...BORDER).roundedRect(X + 10, y, qrSize + 8, qrSize + 8, 3, 3, "S");
  drawQr(doc, ticket.code, X + 14, y + 4, qrSize);
  const fx = X + 10 + qrSize + 18;
  const fw = X + W - 10 - fx;
  const seat = ticket.seat ? `Fila ${ticket.seat.row}, asiento ${ticket.seat.number}` : "General (sin butaca)";
  fact(doc, "Zona", ticket.zoneName, fx, y + 4, fw);
  fact(doc, "Ubicación", seat, fx, y + 20, fw);
  fact(doc, "Titular", order.buyerName || "Titular de la compra", fx, y + 36, fw);
  fact(doc, "Código", ticket.code, fx, y + 52, fw / 2);
  fact(doc, "Pedido", order.code, fx + fw / 2, y + 52, fw / 2);

  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...MUTED);
  doc.text("Presenta este QR en el ingreso. Cada entrada es válida para una persona.", X + W / 2, cardTop + cardH - 8, { align: "center" });
}

/** Browser-only: builds a PDF with one page per ticket and saves it as `<code>.pdf`. */
export async function downloadOrderPdf(order: Order) {
  const [{ jsPDF }, cover] = await Promise.all([import("jspdf"), loadCover(order.event.image)]);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  doc.setProperties({ title: `Entradas ${order.code} · ${order.event.title}`, author: "Ticketera" });
  const tickets = getOrderTickets(order);
  tickets.forEach((ticket, i) => {
    if (i > 0) doc.addPage();
    drawTicket(doc, order, ticket, i, tickets.length, cover);
  });
  saveFile(doc.output("blob"), `${order.code}.pdf`);
}
