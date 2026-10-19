"use server";

import { z } from "zod";
import { AuthorizationError, requirePermission, type UserRow } from "@/modules/auth/server";
import { startCheckoutSchema } from "../schemas/checkout-schema";
import { startCheckout } from "../services/checkout-service";
import { CheckoutError, type CheckoutErrorCode, type StartCheckoutResult } from "../types/checkout";

const MESSAGES: Record<CheckoutErrorCode, string> = {
  unauthenticated: "Inicia sesión para continuar.",
  suspended: "Tu cuenta está suspendida.",
  forbidden: "No tienes permiso para comprar entradas.",
  "invalid-input": "Datos inválidos.",
  "event-unavailable": "Este evento ya no está a la venta.",
  "invalid-tier": "Alguna de las entradas elegidas no es válida. Revisa tu selección.",
  "over-limit": "Superaste el máximo de entradas por compra. Revisa tu selección.",
  "sold-out": "Ya no hay disponibilidad suficiente. Revisa tus entradas.",
  "free-order": "Esta compra no se puede procesar.",
  "payment-unavailable": "No pudimos iniciar el pago. Intenta de nuevo.",
  unexpected: "No se pudo completar la operación. Intenta de nuevo.",
};

const fail = (code: CheckoutErrorCode, fieldErrors?: Record<string, string[]>): StartCheckoutResult => ({
  ok: false,
  code,
  error: MESSAGES[code],
  ...(fieldErrors && { fieldErrors }),
});

/** AC5/AC9: permiso -> Zod -> servicio. Errores de dominio -> mensaje fijo; el resto se registra y es `unexpected`. */
export async function startCheckoutAction(input: unknown): Promise<StartCheckoutResult> {
  let actor: UserRow;
  try {
    actor = await requirePermission("checkout:buy");
  } catch (e) {
    if (e instanceof AuthorizationError) return fail(e.code);
    console.error("checkout action: permission check failed", e);
    return fail("unexpected");
  }

  const parsed = startCheckoutSchema.safeParse(input);
  if (!parsed.success) {
    return fail("invalid-input", z.flattenError(parsed.error as z.ZodError).fieldErrors as Record<string, string[]>);
  }

  try {
    return await startCheckout(actor, parsed.data);
  } catch (e) {
    if (e instanceof CheckoutError) return fail(e.code);
    console.error("checkout action failed", e);
    return fail("unexpected");
  }
}
