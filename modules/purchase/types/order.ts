import type { Currency } from "@/modules/event";

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

export type TicketStatus = "valid" | "used" | "void"; // = enum `ticket_status`

/** Una fila de `tickets`: una entrada por unidad comprada. */
export interface IssuedTicket {
  /** tickets.code: lo que codifica el QR (secreto portador). */
  code: string;
  /** ticket_types.name del ítem al que pertenece. */
  zoneName: string;
  holderName: string;
  status: TicketStatus;
}

export interface Order {
  code: string;
  event: {
    id: string;
    title: string;
    category: string;
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
  /** [] mientras la orden no está paga. */
  tickets: IssuedTicket[];
}
