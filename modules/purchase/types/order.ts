import type { Currency, EventCategory } from "@/modules/event";

export type PaymentMethod = "card" | "yape" | "cash";

export interface OrderItem {
  zoneName: string;
  quantity: number;
  /** "Fila C · 12, 13" for numbered zones. */
  seatLabel?: string;
  amount: number;
}

export interface Order {
  code: string;
  event: {
    id: string;
    title: string;
    category: EventCategory;
    image: string;
    date: string;
    venue: string;
    city: string;
  };
  currency: Currency;
  items: OrderItem[];
  total: number;
  count: number;
  email: string;
  paymentMethod: PaymentMethod;
}
