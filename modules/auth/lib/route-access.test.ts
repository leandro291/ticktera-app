import { describe, expect, it } from "vitest";
import { resolveRouteAccess, type RouteAccess } from "./route-access";
import type { Role } from "./permissions";

type Who = "guest" | Role | "no-claim";

function access(path: string, who: Who): RouteAccess {
  if (who === "guest") return resolveRouteAccess(path, { signedIn: false });
  if (who === "no-claim") return resolveRouteAccess(path, { signedIn: true });
  return resolveRouteAccess(path, { signedIn: true, role: who });
}

const WHO: Who[] = ["guest", "customer", "organizer", "admin", "super_admin", "no-claim"];

const TABLE: Record<string, RouteAccess[]> = {
  //                  guest      customer    organizer   admin       super_admin no-claim
  "/checkout": ["sign-in", "allow", "allow", "allow", "allow", "allow"],
  "/my-tickets": ["sign-in", "allow", "allow", "allow", "allow", "allow"],
  "/organizer": ["sign-in", "forbidden", "allow", "allow", "allow", "allow"],
  "/admin": ["sign-in", "forbidden", "forbidden", "allow", "allow", "allow"],
  "/super-admin": ["sign-in", "forbidden", "forbidden", "forbidden", "allow", "allow"],
};

describe("resolveRouteAccess", () => {
  for (const [path, expected] of Object.entries(TABLE)) {
    it(`AC7: ${path} x sesion/rol`, () => {
      expect(WHO.map((w) => access(path, w))).toEqual(expected);
    });
  }

  it("AC7: subrutas heredan la regla del prefijo", () => {
    expect(access("/organizer/events/new", "customer")).toBe("forbidden");
    expect(access("/super-admin/users", "admin")).toBe("forbidden");
    expect(access("/super-admin/users", "guest")).toBe("sign-in");
    expect(access("/checkout/confirmation", "guest")).toBe("sign-in");
  });

  it("AC7: prefijo exacto, /organizerx no matchea", () => {
    expect(access("/organizerx", "guest")).toBe("allow");
    expect(access("/administrator", "customer")).toBe("allow");
    expect(access("/super-administrator", "guest")).toBe("allow");
  });

  it("AC7: rutas publicas, sign-in/up y webhook no se bloquean", () => {
    for (const path of ["/", "/events", "/events/evt-001", "/sign-in", "/sign-up", "/api/webhooks/clerk"]) {
      expect(WHO.map((w) => access(path, w))).toEqual(Array(WHO.length).fill("allow"));
    }
  });

  it("AC18: webhook de Stripe y job interno no exigen sesion", () => {
    for (const path of ["/api/webhooks/stripe", "/api/internal/expire-orders"]) {
      expect(WHO.map((w) => access(path, w))).toEqual(Array(WHO.length).fill("allow"));
    }
  });
});
