export const ROLES = ["super_admin", "admin", "organizer", "customer"] as const;
export type Role = (typeof ROLES)[number];

export type Permission =
  | "checkout:buy"
  | "organizer:panel"
  | "events:manage-own"
  | "events:read-own"
  | "events:read-all"
  | "events:moderate"
  | "users:suspend"
  | "admin:panel"
  | "users:manage-roles"
  | "super-admin:panel"
  | "tickets:check-in";

// Matriz de system-design §2. Permisos derivados del rol (D2).
// events:manage-own = CRUD de eventos propios; events:moderate = suspender, reactivar y cancelar eventos ajenos.
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  super_admin: [
    "checkout:buy",
    "organizer:panel",
    "events:manage-own",
    "events:read-own",
    "events:read-all",
    "events:moderate",
    "users:suspend",
    "admin:panel",
    "users:manage-roles",
    "super-admin:panel",
    "tickets:check-in",
  ],
  admin: [
    "checkout:buy",
    "organizer:panel",
    "events:manage-own",
    "events:read-own",
    "events:read-all",
    "events:moderate",
    "users:suspend",
    "admin:panel",
    "tickets:check-in",
  ],
  organizer: ["checkout:buy", "organizer:panel", "events:manage-own", "events:read-own", "tickets:check-in"],
  customer: ["checkout:buy"],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Valor ausente o inválido → "customer". */
export function parseRole(value: unknown): Role {
  return ROLES.find((r) => r === value) ?? "customer";
}
