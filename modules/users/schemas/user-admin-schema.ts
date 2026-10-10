import { z } from "zod";

export const setStatusSchema = z.object({
  userId: z.uuid(),
  status: z.enum(["active", "suspended"]),
});

const fullNameField = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .transform((s) => s.replace(/\s+/g, " "));

export const inviteUserSchema = z.object({
  email: z.email().transform((e) => e.toLowerCase()),
  role: z.enum(["admin", "organizer"]),
});

export const updateUserSchema = z.object({
  userId: z.uuid(),
  fullName: fullNameField,
  role: z.enum(["admin", "organizer", "customer"]),
  status: z.enum(["active", "suspended"]).optional(), // solo se aplica si role === "organizer"
});

export const deleteUserSchema = z.object({ userId: z.uuid() });
