import { describe, expect, it } from "vitest";
import { checkInSchema } from "./check-in-schema";

describe("checkInSchema", () => {
  it("AC1: acepta y normaliza un código de 12", () => {
    expect(checkInSchema.parse({ code: " abc-def 234567 " })).toEqual({ code: "ABCDEF234567" });
  });

  it("AC1: rechaza vacío, 11 y 13 caracteres", () => {
    expect(checkInSchema.safeParse({ code: "" }).success).toBe(false);
    expect(checkInSchema.safeParse({ code: "ABCDEF23456" }).success).toBe(false);
    expect(checkInSchema.safeParse({ code: "ABCDEF2345678" }).success).toBe(false);
  });

  it("AC1: rechaza símbolos", () => {
    expect(checkInSchema.safeParse({ code: "ABCDEF23456!" }).success).toBe(false);
    expect(checkInSchema.safeParse({ code: "ABCDEF23456_" }).success).toBe(false);
  });

  it("AC1: rechaza tipos no string o campo ausente", () => {
    expect(checkInSchema.safeParse({ code: 123456789012 }).success).toBe(false);
    expect(checkInSchema.safeParse({}).success).toBe(false);
  });
});
