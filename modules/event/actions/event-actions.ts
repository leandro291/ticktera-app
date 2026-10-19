"use server";

import { z } from "zod";
import type { Permission } from "@/modules/auth";
import { AuthorizationError, requirePermission, type UserRow } from "@/modules/auth/server";
import { zodErrorToFieldErrors } from "../lib/field-errors";
import { deleteEventSchema, moderateEventSchema, saveEventSchema, transitionEventSchema } from "../schemas/event-save-schema";
import { EventError } from "../services/event-error";
import { saveEvent } from "../services/event-save-service";
import { deleteEvent, moderateEvent, transitionEvent } from "../services/event-status-service";
import type { EventActionResult, EventErrorCode, ModerationAction, TransitionAction } from "../types/event-write";

const GENERIC_ERROR = "No se pudo completar la operación. Reintenta.";

const AUTH_MESSAGES = {
  unauthenticated: "Inicia sesión para continuar.",
  suspended: "Tu cuenta está suspendida.",
  forbidden: "No tienes permiso para hacer esto.",
} as const;

// Mensajes fijos por código: nunca detalles del servidor (AC29).
const ERROR_MESSAGES: Record<EventErrorCode, string> = {
  "not-found": "No encontramos el evento.",
  "not-editable": "Este evento ya no se puede editar.",
  "invalid-transition": "El evento cambió de estado. Recarga para ver su estado actual.",
  "not-publishable": "Faltan datos para publicar. Revisa los campos marcados.",
  frozen: "Hay cambios que no se pueden guardar. Revisa los campos marcados.",
  stale: "Otra pestaña modificó este evento. Recarga para ver los cambios.",
  "has-sales": "Ya tiene entradas vendidas o reservadas: cancélalo en lugar de despublicarlo.",
  "has-orders": "Tiene órdenes asociadas, por eso no se puede eliminar. Cancélalo en su lugar.",
  "invalid-category": "Elige una categoría válida.",
  "limit-reached": "Llegaste al máximo de eventos por organizador.",
  "slug-conflict": "No pudimos guardar el evento. Reintenta.",
  "storage-unavailable": "La subida de portadas no está disponible en este momento.",
  "storage-failed": "No pudimos subir la portada. Reintenta.",
  "invalid-image": "La portada tiene que ser JPG, PNG o WebP de hasta 2 MB.",
};

type Success = Extract<EventActionResult, { ok: true }>;

/** D10: permiso → Zod → servicio. El permiso nunca depende del payload. */
async function run<S extends z.ZodType>(
  permission: Permission,
  schema: S,
  input: unknown,
  fn: (actor: UserRow, data: z.output<S>) => Promise<Success>,
): Promise<EventActionResult> {
  let actor: UserRow;
  try {
    actor = await requirePermission(permission);
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, error: AUTH_MESSAGES[e.code] };
    console.error("event action: permission check failed", e);
    return { ok: false, error: GENERIC_ERROR };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Revisa los campos marcados.", fieldErrors: zodErrorToFieldErrors(parsed.error) };
  }

  try {
    return await fn(actor, parsed.data);
  } catch (e) {
    if (e instanceof EventError) return { ok: false, error: ERROR_MESSAGES[e.code], code: e.code, fieldErrors: e.fieldErrors };
    console.error("event action failed", e);
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function saveEventAction(input: unknown): Promise<EventActionResult> {
  return run("events:manage-own", saveEventSchema, input, async (actor, data) => {
    const saved = await saveEvent(actor, data);
    const notice =
      saved.status === "published" && data.publish
        ? "Tu evento se publicó."
        : saved.status === "draft"
          ? "Guardamos tu borrador."
          : "Guardamos los cambios.";
    return { ok: true, notice, id: saved.id, updatedAt: saved.updatedAt };
  });
}

const TRANSITION_NOTICE: Record<TransitionAction, (title: string) => string> = {
  publish: (t) => `Publicamos «${t}».`,
  unpublish: (t) => `«${t}» volvió a borrador.`,
  cancel: (t) => `Cancelamos «${t}».`,
};

export async function transitionEventAction(input: unknown): Promise<EventActionResult> {
  return run("events:manage-own", transitionEventSchema, input, async (actor, data) => {
    const { title } = await transitionEvent(actor, data);
    return { ok: true, notice: TRANSITION_NOTICE[data.action](title) };
  });
}

const MODERATION_NOTICE: Record<ModerationAction, (title: string) => string> = {
  suspend: (t) => `Suspendimos «${t}».`,
  reactivate: (t) => `Reactivamos «${t}».`,
  cancel: (t) => `Cancelamos «${t}».`,
};

export async function moderateEventAction(input: unknown): Promise<EventActionResult> {
  return run("events:moderate", moderateEventSchema, input, async (actor, data) => {
    const { title } = await moderateEvent(actor, data);
    return { ok: true, notice: MODERATION_NOTICE[data.action](title) };
  });
}

export async function deleteEventAction(input: unknown): Promise<EventActionResult> {
  return run("events:manage-own", deleteEventSchema, input, async (actor, data) => {
    const { title } = await deleteEvent(actor, data);
    return { ok: true, notice: `Eliminamos «${title}».` };
  });
}
