import type { Role } from "./permissions";

export type RouteAccess = "allow" | "sign-in" | "forbidden";

export const ROUTE_RULES: { prefix: string; roles: readonly Role[] | "any" }[] = [
  { prefix: "/checkout", roles: "any" },
  { prefix: "/my-tickets", roles: "any" },
  { prefix: "/organizer", roles: ["organizer", "admin", "super_admin"] },
  { prefix: "/admin", roles: ["admin", "super_admin"] },
  { prefix: "/super-admin", roles: ["super_admin"] },
];

// Prefijo exacto: "/organizer" y "/organizer/..." matchean, "/organizerx" no.
const matches = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

export function resolveRouteAccess(
  pathname: string,
  session: { signedIn: boolean; role?: Role },
): RouteAccess {
  const rule = ROUTE_RULES.find((r) => matches(pathname, r.prefix));
  if (!rule) return "allow";
  if (!session.signedIn) return "sign-in";
  // Rol ausente (token viejo o sin configurar): deja pasar, decide la capa 2 (D6).
  if (rule.roles === "any" || !session.role) return "allow";
  return rule.roles.includes(session.role) ? "allow" : "forbidden";
}
