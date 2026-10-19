import { isoToLimaDate, isoToLimaTime, PLACEHOLDER_IMAGE } from "@/modules/event";
import type { IssuedTicket, Order, TicketStatus } from "../types/order";

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
  tickets: IssuedTicket[];
}

/** AC12: filas de la BD → `Order` (montos en soles), el que ya consumen el PDF, el calendario y la confirmación. */
export function toOrder({ order, event, items, buyer, tickets }: OrderRows): Order {
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
    tickets: tickets.map(({ code, zoneName, holderName, status }) => ({ code, zoneName, holderName, status })),
  };
}

/** Una fila por (orden × ítem × ticket); las columnas del ticket son null si el ítem aún no tiene tickets. */
export interface FlatOrderRow {
  code: string;
  status: OrderStatus;
  totalCents: number;
  slug: string;
  title: string;
  categoryName: string;
  coverImageUrl: string | null;
  startsAt: Date;
  venueName: string;
  city: string;
  itemId: string;
  zoneName: string;
  quantity: number;
  unitPriceCents: number;
  ticketCode: string | null;
  ticketStatus: TicketStatus | null;
  holderName: string | null;
  fullName: string;
  email: string;
}

/** AC2: filas planas de un `LEFT JOIN tickets` → órdenes, en orden de aparición; ítems deduplicados por `itemId`. */
export function groupOrderRows(rows: FlatOrderRow[]): { status: OrderStatus; order: Order }[] {
  const groups = new Map<string, { head: FlatOrderRow; items: Map<string, OrderRows["items"][number]>; tickets: IssuedTicket[] }>();
  for (const row of rows) {
    let group = groups.get(row.code);
    if (!group) groups.set(row.code, (group = { head: row, items: new Map(), tickets: [] }));
    if (!group.items.has(row.itemId)) {
      group.items.set(row.itemId, { zoneName: row.zoneName, quantity: row.quantity, unitPriceCents: row.unitPriceCents });
    }
    if (row.ticketCode !== null && row.ticketStatus !== null && row.holderName !== null) {
      group.tickets.push({ code: row.ticketCode, zoneName: row.zoneName, holderName: row.holderName, status: row.ticketStatus });
    }
  }
  return [...groups.values()].map(({ head, items, tickets }) => ({
    status: head.status,
    order: toOrder({
      order: { code: head.code, status: head.status, totalCents: head.totalCents },
      event: {
        slug: head.slug,
        title: head.title,
        categoryName: head.categoryName,
        coverImageUrl: head.coverImageUrl,
        startsAt: head.startsAt,
        venueName: head.venueName,
        city: head.city,
      },
      items: [...items.values()],
      buyer: { fullName: head.fullName, email: head.email },
      tickets,
    }),
  }));
}
