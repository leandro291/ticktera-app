import type { EventDetail, EventSummary } from "@/modules/event";
import type { Order, OrderItem, OrderSeat, PaymentMethod } from "../types/order";
import type { CartSummary } from "./cart-summary";

interface CreateOrderInput {
  code: string;
  event: EventSummary & Partial<Pick<EventDetail, "startTime">>;
  summary: CartSummary;
  buyerName: string;
  email: string;
  paymentMethod: PaymentMethod;
}

/** Immutable snapshot of a paid cart, independent of later cart/venue changes. */
export function createOrder({ code, event, summary, buyerName, email, paymentMethod }: CreateOrderInput): Order {
  return {
    code,
    event: {
      id: event.id,
      title: event.title,
      category: event.category,
      image: event.image,
      date: event.date,
      startTime: event.startTime,
      venue: event.venue,
      city: event.city,
    },
    currency: event.currency,
    items: summary.items.map((item) => ({
      zoneName: item.tier.name,
      quantity: item.quantity,
      seats: item.seats.map(({ row, number }) => ({ row, number })),
      amount: item.amount,
    })),
    total: summary.total,
    count: summary.count,
    buyerName,
    email,
    paymentMethod,
  };
}

/** "Fila C · 12, 13 · Fila D · 4" */
export function formatOrderSeats(seats: OrderSeat[]): string {
  const rows = new Map<string, number[]>();
  for (const seat of [...seats].sort((a, b) => a.row.localeCompare(b.row) || a.number - b.number)) {
    rows.set(seat.row, [...(rows.get(seat.row) ?? []), seat.number]);
  }
  return [...rows].map(([row, numbers]) => `Fila ${row} · ${numbers.join(", ")}`).join(" · ");
}

export interface OrderTicket {
  /** "TK-24817-01" */
  code: string;
  zoneName: string;
  seat?: OrderSeat;
}

/** One ticket per unit bought, in order: each keeps its zone and, for numbered zones, its seat. */
export function getOrderTickets(order: Order): OrderTicket[] {
  const units = order.items.flatMap((item: OrderItem) =>
    Array.from({ length: item.quantity }, (_, i) => ({ zoneName: item.zoneName, seat: item.seats[i] })),
  );
  return units.map((unit, i) => ({ ...unit, code: `${order.code}-${String(i + 1).padStart(2, "0")}` }));
}

/** Mock order number, e.g. "TK-24817". */
export const generateOrderCode = (random: () => number = Math.random) => `TK-${Math.floor(10000 + random() * 90000)}`;
