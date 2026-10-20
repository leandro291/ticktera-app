import { describe, expect, it } from "vitest";
import { getTicketState } from "./ticket-state";

describe("getTicketState", () => {
  it("AC11: valid upcoming ticket is 'Válida' and shows the QR", () => {
    expect(getTicketState("valid", false)).toEqual({ label: "Válida", tone: "ok", showQr: true });
  });

  it("AC11: valid ticket of a past event is 'Evento finalizado' without QR", () => {
    expect(getTicketState("valid", true)).toEqual({ label: "Evento finalizado", tone: "muted", showQr: false });
  });

  it("AC11: used ticket is 'Usada' without QR, upcoming or past", () => {
    const expected = { label: "Usada", tone: "muted", showQr: false };
    expect(getTicketState("used", false)).toEqual(expected);
    expect(getTicketState("used", true)).toEqual(expected);
  });

  it("AC11: void ticket is 'Anulada' without QR, upcoming or past", () => {
    const expected = { label: "Anulada", tone: "error", showQr: false };
    expect(getTicketState("void", false)).toEqual(expected);
    expect(getTicketState("void", true)).toEqual(expected);
  });
});
