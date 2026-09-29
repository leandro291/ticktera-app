import { create } from "zustand";
import type { Order } from "../types/order";

interface OrderState {
  /** Last paid order, shown on the confirmation screen. */
  lastOrder: Order | null;
  placeOrder: (order: Order) => void;
}

export const useOrderStore = create<OrderState>()((set) => ({
  lastOrder: null,
  placeOrder: (order) => set({ lastOrder: order }),
}));
