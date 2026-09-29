import { check, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { orderStatusEnum, paymentStatusEnum, ticketStatusEnum } from "./enums"
import { ticketTypes } from "./events"
import { users } from "./users"

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique("orders_code_unique"),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    status: orderStatusEnum("status").notNull().default("pending"),
    totalCents: integer("total_cents").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("orders_status_expires_at_idx").on(t.status, t.expiresAt),
    index("orders_user_id_idx").on(t.userId),
    check("orders_total_cents_check", sql`${t.totalCents} >= 0`),
  ],
)

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    ticketTypeId: uuid("ticket_type_id")
      .notNull()
      .references(() => ticketTypes.id),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
  },
  (t) => [
    check("order_items_quantity_check", sql`${t.quantity} > 0`),
    index("order_items_order_id_idx").on(t.orderId),
    index("order_items_ticket_type_id_idx").on(t.ticketTypeId),
  ],
)

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "cascade" }),
    code: text("code").notNull().unique("tickets_code_unique"),
    holderName: text("holder_name").notNull(),
    status: ticketStatusEnum("status").notNull().default("valid"),
  },
  (t) => [index("tickets_order_item_id_idx").on(t.orderItemId)],
)

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    stripePaymentIntentId: text("stripe_payment_intent_id")
      .notNull()
      .unique("payments_stripe_payment_intent_id_unique"),
    stripeChargeId: text("stripe_charge_id"),
    status: paymentStatusEnum("status").notNull().default("pending"),
    amountCents: integer("amount_cents").notNull(),
    cardBrand: text("card_brand"),
    cardLast4: text("card_last4"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("payments_order_id_idx").on(t.orderId)],
)

export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
})
