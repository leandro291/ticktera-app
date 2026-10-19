import { describe, expect, it } from "vitest";
import { can, parseRole, ROLE_PERMISSIONS, ROLES, type Permission, type Role } from "./permissions";

const ALL: Permission[] = [
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
];

const EXPECTED: Record<Role, Permission[]> = {
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
  ],
  organizer: ["checkout:buy", "organizer:panel", "events:manage-own", "events:read-own"],
  customer: ["checkout:buy"],
};

describe("permissions", () => {
  it("AC6: ROLE_PERMISSIONS cubre todos los roles", () => {
    expect([...ROLES].sort()).toEqual(Object.keys(ROLE_PERMISSIONS).sort());
  });

  for (const role of ROLES) {
    for (const permission of ALL) {
      const allowed = EXPECTED[role].includes(permission);
      it(`AC6: can(${role}, ${permission}) = ${allowed}`, () => {
        expect(can(role, permission)).toBe(allowed);
      });
    }
  }

  it("AC1 (event-crud): manage-own sin customer; moderate solo admin y super_admin", () => {
    expect(ROLES.filter((r) => can(r, "events:manage-own"))).toEqual(["super_admin", "admin", "organizer"]);
    expect(ROLES.filter((r) => can(r, "events:moderate"))).toEqual(["super_admin", "admin"]);
  });

  it("AC6: parseRole con undefined, inválido y válido", () => {
    expect(parseRole(undefined)).toBe("customer");
    expect(parseRole("foo")).toBe("customer");
    expect(parseRole("admin")).toBe("admin");
  });
});
