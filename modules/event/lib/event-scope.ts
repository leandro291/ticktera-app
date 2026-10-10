import type { Permission } from "@/modules/auth";
import type { AuthorizationErrorCode } from "@/modules/auth/server";
import type { EventListScope } from "../types/event-list";

/** Permiso que exige cada alcance; `published` es público. */
export function permissionForScope(scope: EventListScope): Permission | null {
  if (scope === "mine") return "events:read-own";
  if (scope === "all") return "events:read-all";
  return null;
}

export function statusForAuthError(code: AuthorizationErrorCode): 401 | 403 {
  return code === "unauthenticated" ? 401 : 403;
}
