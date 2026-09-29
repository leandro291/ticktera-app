import { pgEnum } from "drizzle-orm/pg-core"

export const userRoleEnum = pgEnum("user_role", ["super_admin", "admin", "organizer", "customer"])
export const userStatusEnum = pgEnum("user_status", ["active", "suspended"])
export const documentTypeEnum = pgEnum("document_type", ["dni", "ce", "passport"])
export const eventStatusEnum = pgEnum("event_status", ["draft", "published", "cancelled", "suspended"])
export const orderStatusEnum = pgEnum("order_status", ["pending", "paid", "expired", "refunded"])
export const ticketStatusEnum = pgEnum("ticket_status", ["valid", "used", "void"])
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "succeeded", "failed", "refunded"])
