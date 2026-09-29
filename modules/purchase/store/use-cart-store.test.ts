import { beforeEach, describe, expect, it } from "vitest";
import { MAX_TICKETS_PER_ZONE } from "../data/venues";
import { useCartStore } from "./use-cart-store";

const cart = () => useCartStore.getState();
const seat = (id: string, taken = false) => ({ id, taken });

describe("useCartStore", () => {
  beforeEach(() => cart().clear());

  it("AC6: clamps general admission quantities between 0 and the per-zone max", () => {
    cart().setQuantity("evt-001", "general", 2);
    expect(cart().lines.general.quantity).toBe(2);
    cart().setQuantity("evt-001", "general", 99);
    expect(cart().lines.general.quantity).toBe(MAX_TICKETS_PER_ZONE);
    cart().setQuantity("evt-001", "general", 0);
    expect(cart().lines.general).toBeUndefined();
  });

  it("AC6: selects seats up to the max and ignores taken seats", () => {
    for (let i = 1; i <= MAX_TICKETS_PER_ZONE + 2; i++) cart().toggleSeat("evt-001", "norte", seat(`norte-A-${i}`));
    expect(cart().lines.norte.seatIds).toHaveLength(MAX_TICKETS_PER_ZONE);
    expect(cart().lines.norte.quantity).toBe(MAX_TICKETS_PER_ZONE);

    cart().toggleSeat("evt-001", "oriente", seat("oriente-A-1", true));
    expect(cart().lines.oriente).toBeUndefined();
  });

  it("AC6: a selected seat can still be released when the zone is full", () => {
    for (let i = 1; i <= MAX_TICKETS_PER_ZONE; i++) cart().toggleSeat("evt-001", "norte", seat(`norte-A-${i}`));
    cart().toggleSeat("evt-001", "norte", seat("norte-A-3"));
    expect(cart().lines.norte.seatIds).not.toContain("norte-A-3");
    expect(cart().lines.norte.quantity).toBe(MAX_TICKETS_PER_ZONE - 1);
  });

  it("AC6: the limit applies per zone", () => {
    cart().setQuantity("evt-001", "general", MAX_TICKETS_PER_ZONE);
    cart().toggleSeat("evt-001", "norte", seat("norte-A-1"));
    expect(cart().lines.norte.quantity).toBe(1);
  });

  it("switching to another event starts a fresh cart", () => {
    cart().setQuantity("evt-001", "general", 2);
    cart().setQuantity("evt-004", "palco-izquierdo", 1);
    expect(cart().eventId).toBe("evt-004");
    expect(Object.keys(cart().lines)).toEqual(["palco-izquierdo"]);
  });
});
