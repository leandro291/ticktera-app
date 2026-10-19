import { describe, expect, it } from "vitest";
import { buyerSchema, startCheckoutSchema } from "./checkout-schema";

const uuid = "123e4567-e89b-42d3-a456-426614174000";
const uuid2 = "123e4567-e89b-42d3-a456-426614174001";

const buyer = { fullName: "Ana  Pérez", phone: "+51 987 654 321", documentType: "dni", documentNumber: "12345678" };
const input = { eventSlug: "rock-fest", lines: [{ ticketTypeId: uuid, quantity: 2 }], buyer, acceptedTerms: true };

const withBuyer = (b: object) => buyerSchema.safeParse({ ...buyer, ...b });
const withInput = (i: object) => startCheckoutSchema.safeParse({ ...input, ...i });

describe("buyerSchema", () => {
  it("AC7: acepta datos válidos y normaliza espacios del nombre", () => {
    expect(buyerSchema.parse(buyer).fullName).toBe("Ana Pérez");
  });

  it("D7: DNI exige 8 dígitos", () => {
    expect(withBuyer({ documentNumber: "1234567" }).success).toBe(false);
    expect(withBuyer({ documentNumber: "123456789" }).success).toBe(false);
    expect(withBuyer({ documentNumber: "1234567A" }).success).toBe(false);
  });

  it("D7: CE exige 9-12 alfanuméricos", () => {
    const ce = (documentNumber: string) => withBuyer({ documentType: "ce", documentNumber }).success;
    expect(ce("A2345678")).toBe(false);
    expect(ce("A23456789")).toBe(true);
    expect(ce("A23456789012")).toBe(true);
    expect(ce("A234567890123")).toBe(false);
    expect(ce("A2345-6789")).toBe(false);
  });

  it("D7: pasaporte exige 6-12 alfanuméricos", () => {
    const pp = (documentNumber: string) => withBuyer({ documentType: "passport", documentNumber }).success;
    expect(pp("AB123")).toBe(false);
    expect(pp("AB1234")).toBe(true);
    expect(pp("AB1234567890")).toBe(true);
    expect(pp("AB12345678901")).toBe(false);
  });

  it("D7: rechaza tipo de documento desconocido", () => {
    expect(withBuyer({ documentType: "ruc" }).success).toBe(false);
  });

  it("D7: celular 7-20 caracteres permitidos", () => {
    expect(withBuyer({ phone: "987654321" }).success).toBe(true);
    expect(withBuyer({ phone: "(01) 234-5678" }).success).toBe(true);
    expect(withBuyer({ phone: "123456" }).success).toBe(false);
    expect(withBuyer({ phone: "9876-abc-21" }).success).toBe(false);
    expect(withBuyer({ phone: "1".repeat(21) }).success).toBe(false);
  });

  it("AC7: nombre 2-100 y sin HTML", () => {
    expect(withBuyer({ fullName: "A" }).success).toBe(false);
    expect(withBuyer({ fullName: "A".repeat(101) }).success).toBe(false);
    expect(withBuyer({ fullName: "<b>Ana</b>" }).success).toBe(false);
  });
});

describe("startCheckoutSchema", () => {
  it("AC5: acepta un input válido", () => {
    expect(startCheckoutSchema.safeParse(input).success).toBe(true);
  });

  it("AC5: estricto, rechaza userId, price, status y code", () => {
    for (const extra of [{ userId: uuid }, { price: 1 }, { status: "paid" }, { code: "TK-AAAAA" }]) {
      expect(withInput(extra).success).toBe(false);
    }
    expect(withInput({ lines: [{ ticketTypeId: uuid, quantity: 1, unitPriceCents: 1 }] }).success).toBe(false);
    expect(withInput({ buyer: { ...buyer, userId: uuid } }).success).toBe(false);
  });

  it("AC5: exige acceptedTerms === true", () => {
    expect(withInput({ acceptedTerms: false }).success).toBe(false);
    expect(withInput({ acceptedTerms: "true" }).success).toBe(false);
    expect(startCheckoutSchema.safeParse({ ...input, acceptedTerms: undefined }).success).toBe(false);
  });

  it("D7: rechaza tipos repetidos", () => {
    const lines = [{ ticketTypeId: uuid, quantity: 1 }, { ticketTypeId: uuid, quantity: 1 }];
    expect(withInput({ lines }).success).toBe(false);
  });

  it("AC5: líneas 1-20, ticketTypeId uuid y cantidad entera 1-20", () => {
    expect(withInput({ lines: [] }).success).toBe(false);
    const many = Array.from({ length: 21 }, (_, i) => ({
      ticketTypeId: `123e4567-e89b-42d3-a456-${String(i).padStart(12, "0")}`,
      quantity: 1,
    }));
    expect(withInput({ lines: many }).success).toBe(false);
    expect(withInput({ lines: many.slice(0, 20) }).success).toBe(true);
    expect(withInput({ lines: [{ ticketTypeId: "abc", quantity: 1 }] }).success).toBe(false);
    for (const quantity of [0, 21, 1.5, -1]) {
      expect(withInput({ lines: [{ ticketTypeId: uuid2, quantity }] }).success).toBe(false);
    }
    expect(withInput({ lines: [{ ticketTypeId: uuid2, quantity: 20 }] }).success).toBe(true);
  });

  it("AC7: el comprador se valida dentro del input", () => {
    expect(withInput({ buyer: { ...buyer, documentNumber: "1" } }).success).toBe(false);
  });
});
