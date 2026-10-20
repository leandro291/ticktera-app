import type { TicketStatus } from "@/modules/purchase";

type TicketState = {
  label: "Válida" | "Usada" | "Anulada" | "Evento finalizado";
  tone: "ok" | "muted" | "error";
  /** Only a valid ticket of an upcoming event shows its QR. */
  showQr: boolean;
};

/** Visible state of a ticket (text, never color alone). `past`: the order's event already happened. */
export function getTicketState(status: TicketStatus, past: boolean): TicketState {
  if (status === "void") return { label: "Anulada", tone: "error", showQr: false };
  if (status === "used") return { label: "Usada", tone: "muted", showQr: false };
  if (past) return { label: "Evento finalizado", tone: "muted", showQr: false };
  return { label: "Válida", tone: "ok", showQr: true };
}
