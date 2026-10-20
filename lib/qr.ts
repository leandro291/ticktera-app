import { create } from "qrcode";

/**
 * Pure QR matrix (no DOM; works on server and client). Single entry point to "qrcode".
 * Used by TicketQr (screen) and the ticket PDF.
 * `cells` is row-major (size*size), true = dark module. It does NOT include the quiet zone:
 * callers add 4 modules of margin when drawing.
 */
export function qrMatrix(text: string): { size: number; cells: boolean[] } {
  const { size, data } = create(text, { errorCorrectionLevel: "M" }).modules;
  return { size, cells: Array.from(data, (v) => v === 1) };
}
