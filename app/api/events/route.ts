import type { NextRequest } from "next/server";
import { AuthorizationError, requirePermission } from "@/modules/auth/server";
import { eventListQuerySchema } from "@/modules/event/schemas/event-list-schema";
import { permissionForScope, statusForAuthError } from "@/modules/event/lib/event-scope";
import { listEvents } from "@/modules/event/server";

// Única barrera de este endpoint: proxy.ts lo deja pasar (D1).
export async function GET(req: NextRequest): Promise<Response> {
  // Solo se lee el primer `scope`; cualquier otro parámetro se ignora (AC2).
  const parsed = eventListQuerySchema.safeParse({ scope: req.nextUrl.searchParams.get("scope") });
  if (!parsed.success) return Response.json({ error: "invalid-query" }, { status: 400 });
  const { scope } = parsed.data;

  try {
    const permission = permissionForScope(scope);
    if (!permission) return Response.json(await listEvents({ scope: "published" }));

    // El id del organizador sale de la fila de la BD vía requirePermission, nunca de la query (D2).
    const user = await requirePermission(permission);
    const items = await listEvents(
      scope === "mine" ? { scope: "mine", organizerId: user.id } : { scope: "all" },
    );
    return Response.json(items, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return Response.json(
        { error: err.code },
        { status: statusForAuthError(err.code), headers: { "Cache-Control": "private, no-store" } },
      );
    }
    console.error("GET /api/events failed", err);
    return Response.json({ error: "internal" }, { status: 500 });
  }
}
