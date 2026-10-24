import { describe, expect, it } from "vitest";
import { normalizeTicketCode } from "./ticket-code";

describe("normalizeTicketCode", () => {
  it("AC1: pasa a mayúsculas y quita espacios y guiones", () => {
    expect(normalizeTicketCode(" abc-def 234567 ")).toBe("ABCDEF234567");
  });

  it("AC1: quita saltos de línea y tabs (lector USB)", () => {
    expect(normalizeTicketCode("abcdef234567\r\n")).toBe("ABCDEF234567");
    expect(normalizeTicketCode("abc\tdef\n234567")).toBe("ABCDEF234567");
  });

  it("AC1: un código ya normalizado no cambia", () => {
    expect(normalizeTicketCode("ABCDEF234567")).toBe("ABCDEF234567");
  });
});
