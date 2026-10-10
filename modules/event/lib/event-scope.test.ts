import { describe, expect, it } from "vitest";
import { can, ROLES, type Role } from "@/modules/auth";
import type { EventListScope } from "../types/event-list";
import { permissionForScope, statusForAuthError } from "./event-scope";

function allowed(role: Role, scope: EventListScope): boolean {
  const permission = permissionForScope(scope);
  return permission === null || can(role, permission);
}

describe("permissionForScope", () => {
  it("AC3: cada alcance exige su permiso", () => {
    expect(permissionForScope("mine")).toBe("events:read-own");
    expect(permissionForScope("all")).toBe("events:read-all");
    expect(permissionForScope("published")).toBeNull();
  });

  it("AC3: customer no puede mine ni all", () => {
    expect(allowed("customer", "mine")).toBe(false);
    expect(allowed("customer", "all")).toBe(false);
  });

  it("AC3: organizer puede mine y no all", () => {
    expect(allowed("organizer", "mine")).toBe(true);
    expect(allowed("organizer", "all")).toBe(false);
  });

  it("AC3: admin y super_admin pueden mine y all", () => {
    for (const role of ["admin", "super_admin"] as const) {
      expect(allowed(role, "mine")).toBe(true);
      expect(allowed(role, "all")).toBe(true);
    }
  });

  it("AC3: published no exige permiso a ningún rol", () => {
    for (const role of ROLES) expect(allowed(role, "published")).toBe(true);
  });
});

describe("statusForAuthError", () => {
  it("AC3: unauthenticated 401; suspended y forbidden 403", () => {
    expect(statusForAuthError("unauthenticated")).toBe(401);
    expect(statusForAuthError("suspended")).toBe(403);
    expect(statusForAuthError("forbidden")).toBe(403);
  });
});
