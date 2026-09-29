import type { Currency, EventCategory } from "@/modules/event";

export type PaymentMethod = "card" | "yape" | "cash";

export interface OrderSeat {
  row: string;
  number: number;
}

export interface OrderItem {
  zoneName: string;
  quantity: number;
  /** One entry per ticket in numbered zones; empty for general admission. */
  seats: OrderSeat[];
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
    startTime?: string;
    venue: string;
    city: string;
  };
  currency: Currency;
  items: OrderItem[];
  total: number;
  count: number;
  buyerName: string;
  email: string;
  paymentMethod: PaymentMethod;
}
