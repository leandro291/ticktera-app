import type { NextRequest } from "next/server";
import { z } from "zod";
import { AuthorizationError, requirePermission } from "@/modules/auth/server";
import { EVENT_LIMITS } from "@/modules/event/lib/event-limits";
import { statusForAuthError } from "@/modules/event/lib/event-scope";
import type { EventErrorCode } from "@/modules/event/types/event-write";
import { EventError, removeEventCover, setEventCover } from "@/modules/event/server";

const NO_STORE = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE });

const STATUS: Partial<Record<EventErrorCode, number>> = {
  "not-found": 404,
  "not-editable": 409,
  "invalid-image": 415,
  "storage-failed": 502,
  "storage-unavailable": 503,
};

/** AC20: CSRF, id, permiso (en ese orden). Devuelve la respuesta de error o null si se puede seguir. */
async function guard(req: NextRequest, id: string): Promise<Response | null> {
  // La cookie de Clerk ya es SameSite=Lax; no se compara Origin porque detrás de proxies el host difiere (D14).
  if (req.headers.get("sec-fetch-site") === "cross-site") return json({ error: "forbidden" }, 403);
  if (!z.uuid().safeParse(id).success) return json({ error: "not-found" }, 404);
  return null;
}

async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AuthorizationError) return json({ error: err.code }, statusForAuthError(err.code));
    if (err instanceof EventError) return json({ error: err.code }, STATUS[err.code] ?? 400);
    console.error("cover route failed", err);
    return json({ error: "internal" }, 500);
  }
}

export async function POST(req: NextRequest, ctx: RouteContext<"/api/events/[id]/cover">): Promise<Response> {
  const { id } = await ctx.params;
  return (
    (await guard(req, id)) ??
    handle(async () => {
      const actor = await requirePermission("events:manage-own");
      // Corte temprano por cabecera (+64 KiB de margen multipart) y luego por tamaño real del archivo.
      if (Number(req.headers.get("content-length") ?? 0) > EVENT_LIMITS.coverMaxBytes + 64 * 1024) {
        return json({ error: "too-large" }, 413);
      }
      const file = (await req.formData()).get("file");
      if (!(file instanceof File)) return json({ error: "invalid-image" }, 415);
      if (file.size > EVENT_LIMITS.coverMaxBytes) return json({ error: "too-large" }, 413);
      return json(await setEventCover(actor, id, file));
    })
  );
}

export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/events/[id]/cover">): Promise<Response> {
  const { id } = await ctx.params;
  return (
    (await guard(req, id)) ??
    handle(async () => {
      const actor = await requirePermission("events:manage-own");
      await removeEventCover(actor, id);
      return new Response(null, { status: 204, headers: NO_STORE });
    })
  );
}
