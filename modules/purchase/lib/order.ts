import type { EventSummary } from "@/modules/event";
import type { Order, PaymentMethod } from "../types/order";
import { formatSeatList, type CartSummary } from "./cart-summary";

interface CreateOrderInput {
  code: string;
  event: EventSummary;
  summary: CartSummary;
  email: string;
  paymentMethod: PaymentMethod;
}

/** Immutable snapshot of a paid cart, independent of later cart/venue changes. */
export function createOrder({ code, event, summary, email, paymentMethod }: CreateOrderInput): Order {
  return {
    code,
    event: {
      id: event.id,
      title: event.title,
      category: event.category,
      image: event.image,
      date: event.date,
      venue: event.venue,
      city: event.city,
    },
    currency: event.currency,
    items: summary.items.map((item) => ({
      zoneName: item.tier.name,
      quantity: item.quantity,
      seatLabel: item.seats.length ? formatSeatList(item.seats) : undefined,
      amount: item.amount,
    })),
    total: summary.total,
    count: summary.count,
    email,
    paymentMethod,
  };
}

/** Mock order number, e.g. "TK-24817". */
export const generateOrderCode = (random: () => number = Math.random) => `TK-${Math.floor(10000 + random() * 90000)}`;
