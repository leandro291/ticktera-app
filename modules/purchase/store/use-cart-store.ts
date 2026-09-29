import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistOptions } from "@/lib/persist";
import { MAX_TICKETS_PER_ZONE } from "../data/venues";
import type { CartLine, Seat } from "../types/venue";

interface CartState {
  eventId: string | null;
  lines: Record<string, CartLine>;
  setQuantity: (eventId: string, zoneId: string, quantity: number) => void;
  toggleSeat: (eventId: string, zoneId: string, seat: Pick<Seat, "id" | "taken">) => void;
  clear: () => void;
}

/** Lines of the given event; a cart from another event is discarded. */
const linesFor = (state: CartState, eventId: string) => (state.eventId === eventId ? state.lines : {});

const withLine = (lines: Record<string, CartLine>, line: CartLine) => {
  const next = { ...lines };
  if (line.quantity > 0) next[line.zoneId] = line;
  else delete next[line.zoneId];
  return next;
};

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      eventId: null,
      lines: {},

      setQuantity: (eventId, zoneId, quantity) =>
        set((state) => ({
          eventId,
          lines: withLine(linesFor(state, eventId), {
            zoneId,
            quantity: Math.max(0, Math.min(MAX_TICKETS_PER_ZONE, Math.floor(quantity))),
            seatIds: [],
          }),
        })),

      toggleSeat: (eventId, zoneId, seat) =>
        set((state) => {
          const lines = linesFor(state, eventId);
          const seatIds = lines[zoneId]?.seatIds ?? [];
          const selected = seatIds.includes(seat.id);
          if (!selected && (seat.taken || seatIds.length >= MAX_TICKETS_PER_ZONE)) return state;
          const next = selected ? seatIds.filter((id) => id !== seat.id) : [...seatIds, seat.id];
          return { eventId, lines: withLine(lines, { zoneId, quantity: next.length, seatIds: next }) };
        }),

      clear: () => set({ eventId: null, lines: {} }),
    }),
    persistOptions<CartState>("cart"),
  ),
);
