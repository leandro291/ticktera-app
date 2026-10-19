import { describe, expect, it } from "vitest";
import { CODE_ALPHABET, generateOrderCode, generateTicketCode } from "./order-code";

describe("order-code", () => {
  it("AC2: el alfabeto no tiene caracteres ambiguos", () => {
    expect(CODE_ALPHABET).toHaveLength(31);
    expect(CODE_ALPHABET).not.toMatch(/[01OIL]/);
  });

  it("AC2: la orden es TK- + 5 caracteres del alfabeto", () => {
    for (let i = 0; i < 200; i++) expect(generateOrderCode()).toMatch(/^TK-[2-9A-HJKMNP-Z]{5}$/);
  });

  it("AC2: la entrada tiene 12 caracteres del alfabeto", () => {
    for (let i = 0; i < 200; i++) expect(generateTicketCode()).toMatch(/^[2-9A-HJKMNP-Z]{12}$/);
  });

  it("AC2: randomInt inyectado determinista y acotado al alfabeto", () => {
    const seen: number[] = [];
    let n = 0;
    const rand = (max: number) => {
      seen.push(max);
      return n++ % max;
    };
    expect(generateOrderCode(rand)).toBe("TK-23456");
    expect(generateTicketCode(() => CODE_ALPHABET.length - 1)).toBe("Z".repeat(12));
    expect(new Set(seen)).toEqual(new Set([CODE_ALPHABET.length]));
  });

  it("AC2: dos entradas seguidas no coinciden", () => {
    expect(generateTicketCode()).not.toBe(generateTicketCode());
  });
});
