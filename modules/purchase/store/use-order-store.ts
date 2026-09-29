import { create } from "zustand";
import type { Order } from "../types/order";

interface OrderState {
  /** Orders paid in this session, newest first. */
  orders: Order[];
  placeOrder: (order: Order) => void;
}

export const useOrderStore = create<OrderState>()((set) => ({
  orders: [],
  placeOrder: (order) => set((state) => ({ orders: [order, ...state.orders] })),
}));

/** Last paid order, shown on the confirmation screen. */
export const useLastOrder = () => useOrderStore((s) => s.orders[0] ?? null);

/** Orders paid in this session (for "Mis entradas"). */
export const usePlacedOrders = () => useOrderStore((s) => s.orders);
