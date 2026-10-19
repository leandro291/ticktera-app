import { isoToLimaDate, isoToLimaTime, PLACEHOLDER_IMAGE } from "@/modules/event";
import type { Order } from "../types/order";

export type OrderStatus = "pending" | "paid" | "expired" | "refunded";

/** Lo que lee `getOrderByCode`: la orden, su evento, sus ítems por zona y el comprador (todo ya del dueño). */
export interface OrderRows {
  order: { code: string; status: OrderStatus; totalCents: number };
  event: {
    slug: string;
    title: string;
    categoryName: string;
    coverImageUrl: string | null;
    startsAt: Date;
    venueName: string;
    city: string;
  };
  items: { zoneName: string; quantity: number; unitPriceCents: number }[];
  buyer: { fullName: string; email: string };
}

/** AC12: filas de la BD → `Order` (montos en soles), el que ya consumen el PDF, el calendario y la confirmación. */
export function toOrder({ order, event, items, buyer }: OrderRows): Order {
  const startsAt = event.startsAt.toISOString();
  return {
    code: order.code,
    event: {
      id: event.slug,
      title: event.title,
      category: event.categoryName,
      image: event.coverImageUrl ?? PLACEHOLDER_IMAGE,
      date: isoToLimaDate(startsAt),
      startTime: isoToLimaTime(startsAt),
      venue: event.venueName,
      city: event.city,
    },
    currency: "PEN",
    items: items.map((item) => ({
      zoneName: item.zoneName,
      quantity: item.quantity,
      seats: [], // se vende por zona y cantidad
      amount: (item.quantity * item.unitPriceCents) / 100,
    })),
    total: order.totalCents / 100,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    buyerName: buyer.fullName,
    email: buyer.email,
    paymentMethod: "card",
  };
}
