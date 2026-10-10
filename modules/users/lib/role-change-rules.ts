import type { Role } from "@/modules/auth";

type Actor = { id: string };
type Target = { id: string; role: Role };

const ASSIGNABLE_ROLES: readonly Role[] = ["admin", "organizer", "customer"];

export type RoleChangeResult =
  | { ok: true }
  | { ok: false; reason: "self" | "target-super-admin" | "invalid-role" };

export type StatusChangeResult =
  | { ok: true }
  | { ok: false; reason: "self" | "target-super-admin" };

// D8: un solo super_admin. No se toca a uno mismo ni al super_admin, ni se asigna super_admin.
export function checkRoleChange(actor: Actor, target: Target, next: Role): RoleChangeResult {
  if (actor.id === target.id) return { ok: false, reason: "self" };
  if (target.role === "super_admin") return { ok: false, reason: "target-super-admin" };
  if (!ASSIGNABLE_ROLES.includes(next)) return { ok: false, reason: "invalid-role" };
  return { ok: true };
}

export function checkStatusChange(actor: Actor, target: Target): StatusChangeResult {
  if (actor.id === target.id) return { ok: false, reason: "self" };
  if (target.role === "super_admin") return { ok: false, reason: "target-super-admin" };
  return { ok: true };
}

export type UserUpdateResult =
  | { ok: true }
  | { ok: false; reason: "self" | "target-super-admin" | "invalid-role" | "suspended-organizer" };

export type UserDeleteResult =
  | { ok: true }
  | { ok: false; reason: "self" | "target-super-admin" };

// D8: un organizador suspendido no cambia de rol hasta reactivarlo.
export function checkUserUpdate(
  actor: Actor,
  target: Target & { status: "active" | "suspended" },
  next: { role: Role },
): UserUpdateResult {
  const base = checkRoleChange(actor, target, next.role);
  if (!base.ok) return base;
  if (target.role === "organizer" && target.status === "suspended" && next.role !== "organizer") {
    return { ok: false, reason: "suspended-organizer" };
  }
  return { ok: true };
}

export function checkUserDelete(actor: Actor, target: Target): UserDeleteResult {
  return checkStatusChange(actor, target);
}
