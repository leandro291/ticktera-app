import { create } from "zustand";
import { persist } from "zustand/middleware";
import { persistOptions } from "@/lib/persist";
import type { Order } from "../types/order";

interface OrderState {
  /** Paid orders, newest first (saved in localStorage). */
  orders: Order[];
  placeOrder: (order: Order) => void;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set) => ({
      orders: [],
      placeOrder: (order) => set((state) => ({ orders: [order, ...state.orders] })),
    }),
    persistOptions<OrderState>("orders"),
  ),
);

/** Last paid order, shown on the confirmation screen. */
export const useLastOrder = () => useOrderStore((s) => s.orders[0] ?? null);

/** Orders paid in this session (for "Mis entradas"). */
export const usePlacedOrders = () => useOrderStore((s) => s.orders);
