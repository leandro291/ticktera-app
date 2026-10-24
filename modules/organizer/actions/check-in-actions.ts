"use server";

import { AuthorizationError, requirePermission } from "@/modules/auth/server";
import { checkInSchema } from "../schemas/check-in-schema";
import { CheckInError, checkInTicket } from "../services/check-in-service";
import type { CheckInErrorCode, CheckInResult } from "../types/check-in";

const GENERIC_ERROR = "No se pudo validar. Reintenta.";

const AUTH_MESSAGES = {
  unauthenticated: "Inicia sesión para continuar.",
  suspended: "Tu cuenta está suspendida.",
  forbidden: "No tienes permiso para hacer esto.",
} as const;

// Mensajes fijos por código: nunca detalles del servidor ni el código ingresado (AC10).
const ERROR_MESSAGES: Record<CheckInErrorCode, string> = {
  "invalid-code": "Código inválido: tiene 12 caracteres.",
  "not-found": "No encontramos esa entrada.",
  "already-used": "Esta entrada ya fue usada.",
  void: "Esta entrada está anulada.",
  "event-inactive": "El evento está cancelado o suspendido.",
  "rate-limited": "Demasiados intentos fallidos. Espera un minuto.",
};

/** Permiso → Zod → servicio. El permiso nunca depende del payload. */
export async function checkInTicketAction(input: unknown): Promise<CheckInResult> {
  let actor;
  try {
    actor = await requirePermission("tickets:check-in");
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, error: AUTH_MESSAGES[e.code] };
    console.error("check-in action: permission check failed", e);
    return { ok: false, error: GENERIC_ERROR };
  }

  const parsed = checkInSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: ERROR_MESSAGES["invalid-code"], code: "invalid-code" };

  try {
    return { ok: true, ticket: await checkInTicket(actor, parsed.data) };
  } catch (e) {
    if (e instanceof CheckInError) return { ok: false, error: ERROR_MESSAGES[e.code], code: e.code };
    // Drizzle mete los parámetros del query (el código) en e.message: se loguea solo la causa (AC10).
    const cause = e instanceof Error && e.cause instanceof Error ? e.cause : null;
    console.error("check-in action failed", cause ? `${cause.name}: ${cause.message}` : "unknown");
    return { ok: false, error: GENERIC_ERROR };
  }
}
