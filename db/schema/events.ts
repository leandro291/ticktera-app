import { check, index, integer, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { eventStatusEnum } from "./enums"
import { users } from "./users"

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique("categories_slug_unique"),
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").notNull(),
})

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizerId: uuid("organizer_id")
      .notNull()
      .references(() => users.id),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    slug: text("slug").notNull().unique("events_slug_unique"),
    title: text("title").notNull(),
    description: text("description"),
    coverImageUrl: text("cover_image_url"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    venueName: text("venue_name").notNull(),
    address: text("address"),
    city: text("city").notNull(),
    lat: numeric("lat"),
    lng: numeric("lng"),
    status: eventStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("events_status_starts_at_idx").on(t.status, t.startsAt),
    index("events_city_idx").on(t.city),
    index("events_category_id_idx").on(t.categoryId),
    index("events_organizer_id_idx").on(t.organizerId),
  ],
)

export const ticketTypes = pgTable(
  "ticket_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    priceCents: integer("price_cents").notNull(),
    capacity: integer("capacity").notNull(),
    maxPerOrder: integer("max_per_order").notNull(),
    sortOrder: integer("sort_order").notNull(),
  },
  (t) => [
    unique("ticket_types_event_id_name_unique").on(t.eventId, t.name),
    check("ticket_types_capacity_check", sql`${t.capacity} >= 0`),
    check("ticket_types_price_cents_check", sql`${t.priceCents} >= 0`),
    check("ticket_types_max_per_order_check", sql`${t.maxPerOrder} > 0`),
  ],
)
