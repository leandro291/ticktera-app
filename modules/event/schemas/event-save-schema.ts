import { z } from "zod";
import { EVENT_LIMITS } from "../lib/event-limits";
import { limaDateTimeToDate } from "../lib/lima-datetime";

// D18: el contenido se rechaza (no se limpia) si trae HTML, caracteres de control (salvo \n en la descripción) o de dirección bidi.
const HTML_TAG = /<\/?[a-z!][^>]*>/i;
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const BIDI = /[؜‎‏‪-‮⁦-⁩]/;

const safeText = (s: z.ZodString) =>
  s
    .refine((v) => !HTML_TAG.test(v), "No se permite HTML.")
    .refine((v) => !CONTROL.test(v) && !BIDI.test(v), "Contiene caracteres no permitidos.");

const collapse = (v: string) => v.trim().replace(/\s+/g, " ");
const maxMessage = (max: number) => `Máximo ${max} caracteres.`;

/** Una línea, recortada y con espacios colapsados; obligatoria. */
const plain = (max: number) =>
  z.string().transform(collapse).pipe(safeText(z.string().min(1, "Completa este campo.").max(max, maxMessage(max))));

/** Una línea opcional ("" permitido). */
const optionalPlain = (max: number) => z.string().transform(collapse).pipe(safeText(z.string().max(max, maxMessage(max))));

/** Varias líneas: conserva \n, colapsa el resto de espacios. */
const multiline = (max: number) =>
  z
    .string()
    .transform((v) => v.replace(/\r\n?/g, "\n").replace(/[^\S\n]+/g, " ").trim())
    .pipe(safeText(z.string().max(max, maxMessage(max))));

export const tierInputSchema = z.object({
  id: z.uuid().optional(),
  name: plain(EVENT_LIMITS.tierNameMax),
  priceCents: z
    .number("Precio inválido.")
    .int("Precio inválido.")
    .min(0, "Precio inválido.")
    .max(EVENT_LIMITS.maxPriceCents, `Máximo S/ ${(EVENT_LIMITS.maxPriceCents / 100).toLocaleString("es-PE")}.`),
  capacity: z
    .number("Capacidad inválida.")
    .int("Capacidad inválida.")
    .min(0, "Capacidad inválida.")
    .max(EVENT_LIMITS.maxCapacity, `Máximo ${EVENT_LIMITS.maxCapacity.toLocaleString("es-PE")} entradas.`),
  maxPerOrder: z
    .number()
    .int()
    .min(1, `Entre 1 y ${EVENT_LIMITS.maxPerOrderLimit}.`)
    .max(EVENT_LIMITS.maxPerOrderLimit, `Entre 1 y ${EVENT_LIMITS.maxPerOrderLimit}.`)
    .default(EVENT_LIMITS.defaultMaxPerOrder),
});

// z.object descarta claves extra: organizerId, status, slug, publishedAt y coverImageUrl nunca llegan al servicio (D10).
export const saveEventSchema = z
  .object({
    id: z.uuid().optional(),
    expectedUpdatedAt: z.iso.datetime().optional(),
    title: plain(EVENT_LIMITS.titleMax),
    categoryId: z.uuid("Elige una categoría."),
    description: multiline(EVENT_LIMITS.descriptionMax),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida."),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida."),
    venueName: plain(EVENT_LIMITS.venueMax),
    address: optionalPlain(EVENT_LIMITS.addressMax),
    city: plain(EVENT_LIMITS.cityMax),
    tiers: z.array(tierInputSchema).max(EVENT_LIMITS.maxTiers, `Máximo ${EVENT_LIMITS.maxTiers} tipos de entrada.`),
    publish: z.boolean().default(false),
    acknowledgeBuyerImpact: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (v.id && !v.expectedUpdatedAt) {
      ctx.addIssue({ code: "custom", path: ["expectedUpdatedAt"], message: "Recarga la página e inténtalo de nuevo." });
    }
    const seen = new Set<string>();
    v.tiers.forEach((tier, i) => {
      const key = tier.name.toLocaleLowerCase("es-PE");
      if (seen.has(key)) ctx.addIssue({ code: "custom", path: ["tiers", i, "name"], message: "Ya hay otro tipo con este nombre." });
      seen.add(key);
    });
    if (!limaDateTimeToDate(v.date, v.startTime)) ctx.addIssue({ code: "custom", path: ["date"], message: "Fecha inválida." });
  });

export const transitionEventSchema = z.object({ id: z.uuid(), action: z.enum(["publish", "unpublish", "cancel"]) });
export const moderateEventSchema = z.object({ id: z.uuid(), action: z.enum(["suspend", "reactivate", "cancel"]) });
export const deleteEventSchema = z.object({ id: z.uuid() });
