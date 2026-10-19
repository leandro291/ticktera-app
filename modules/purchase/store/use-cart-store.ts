import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistOptions } from "@/lib/persist";
import type { CartLine } from "../types/venue";

interface CartState {
  eventId: string | null;
  lines: Record<string, CartLine>;
  /** Sets how many tickets of a zone, clamped to 0…max (the zone's per-order limit capped by what's left). */
  setQuantity: (eventId: string, zoneId: string, quantity: number, max: number) => void;
  clear: () => void;
}

/** Lines of the given event; a cart from another event is discarded. */
const linesFor = (state: CartState, eventId: string) => (state.eventId === eventId ? state.lines : {});

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      eventId: null,
      lines: {},

      setQuantity: (eventId, zoneId, quantity, max) =>
        set((state) => {
          const lines = { ...linesFor(state, eventId) };
          const next = Math.max(0, Math.min(max, Math.floor(quantity)));
          if (next > 0) lines[zoneId] = { zoneId, quantity: next };
          else delete lines[zoneId];
          return { eventId, lines };
        }),

      clear: () => set({ eventId: null, lines: {} }),
    }),
    persistOptions<CartState>("cart"),
  ),
);
