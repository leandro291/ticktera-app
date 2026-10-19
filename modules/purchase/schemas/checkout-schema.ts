import { z } from "zod";
import { EVENT_LIMITS } from "@/modules/event";

// El tope real por tipo lo aplica planOrder.
const MAX_LINE_QUANTITY = EVENT_LIMITS.maxPerOrderLimit;
const MAX_LINES = 20;

const DOCUMENT_PATTERNS = {
  dni: /^[0-9]{8}$/,
  ce: /^[A-Za-z0-9]{9,12}$/,
  passport: /^[A-Za-z0-9]{6,12}$/,
} as const;

const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/;

export const buyerSchema = z
  .strictObject({
    fullName: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .refine((s) => !/[<>]/.test(s), "Sin HTML")
      .transform((s) => s.replace(/\s+/g, " ")),
    phone: z.string().trim().regex(PHONE_PATTERN),
    documentType: z.enum(["dni", "ce", "passport"]),
    documentNumber: z.string().trim(),
  })
  .superRefine((buyer, ctx) => {
    if (!DOCUMENT_PATTERNS[buyer.documentType].test(buyer.documentNumber)) {
      ctx.addIssue({ code: "custom", path: ["documentNumber"], message: "Documento inválido" });
    }
  });

export const startCheckoutSchema = z.strictObject({
  eventSlug: z.string().trim().min(1).max(200),
  lines: z
    .array(
      z.strictObject({
        ticketTypeId: z.uuid(),
        quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
      }),
    )
    .min(1)
    .max(MAX_LINES)
    .refine((lines) => new Set(lines.map((l) => l.ticketTypeId)).size === lines.length, "Tipos repetidos"),
  buyer: buyerSchema,
  acceptedTerms: z.literal(true),
});

export type StartCheckoutInput = z.output<typeof startCheckoutSchema>;
