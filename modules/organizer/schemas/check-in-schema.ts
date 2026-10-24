import { z } from "zod";
import { normalizeTicketCode } from "../lib/ticket-code";

// trim → normalize → 12 caracteres [A-Z0-9]. El alfabeto exacto lo resuelve la búsqueda exacta en BD.
export const checkInSchema = z.object({
  code: z
    .string()
    .transform(normalizeTicketCode)
    .pipe(z.string().regex(/^[A-Z0-9]{12}$/, "invalid-code")),
});

export type CheckInInput = z.output<typeof checkInSchema>;
