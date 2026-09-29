import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { documentTypeEnum, userRoleEnum, userStatusEnum } from "./enums"

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull().unique("users_clerk_user_id_unique"),
  email: text("email").notNull().unique("users_email_unique"),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  documentType: documentTypeEnum("document_type"),
  documentNumber: text("document_number"),
  role: userRoleEnum("role").notNull().default("customer"),
  status: userStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
})
