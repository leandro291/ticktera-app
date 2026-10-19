import { beforeEach, describe, expect, it } from "vitest";
import { useCartStore } from "./use-cart-store";

const cart = () => useCartStore.getState();

describe("useCartStore", () => {
  beforeEach(() => cart().clear());

  it("AC8: recorta la cantidad entre 0 y el máximo de la zona", () => {
    cart().setQuantity("rock", "general", 2, 6);
    expect(cart().lines.general.quantity).toBe(2);
    cart().setQuantity("rock", "general", 99, 6);
    expect(cart().lines.general.quantity).toBe(6);
    cart().setQuantity("rock", "general", 0, 6);
    expect(cart().lines.general).toBeUndefined();
  });

  it("AC8: el máximo incluye el cupo restante; sin cupo no se agrega", () => {
    cart().setQuantity("rock", "vip", 5, 3);
    expect(cart().lines.vip.quantity).toBe(3);
    cart().setQuantity("rock", "agotada", 2, 0);
    expect(cart().lines.agotada).toBeUndefined();
  });

  it("AC8: el límite es por zona", () => {
    cart().setQuantity("rock", "general", 6, 6);
    cart().setQuantity("rock", "vip", 1, 6);
    expect(cart().lines.vip.quantity).toBe(1);
    expect(cart().lines.general.quantity).toBe(6);
  });

  it("cambiar de evento empieza un carrito nuevo", () => {
    cart().setQuantity("rock", "general", 2, 6);
    cart().setQuantity("jazz", "platea", 1, 6);
    expect(cart().eventId).toBe("jazz");
    expect(Object.keys(cart().lines)).toEqual(["platea"]);
  });
});
