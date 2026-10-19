import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { TierInput } from "../types/event-write";
import { FREEZE_MESSAGES } from "./event-freeze";
import { PUBLISH_MESSAGES } from "./event-publish";
import { freezeIssuesToFieldErrors, publishIssuesToFieldErrors, zodErrorToFieldErrors } from "./field-errors";

const tier = (id: string | undefined, name = "General"): TierInput => ({ id, name, priceCents: 0, capacity: 1, maxPerOrder: 6 });

describe("zodErrorToFieldErrors", () => {
  it("AC24: rutas con índice y primer mensaje por ruta", () => {
    const schema = z.object({
      title: z.string().min(1, "uno").min(2, "dos"),
      tiers: z.array(z.object({ name: z.string().min(1, "nombre") })),
    });
    const r = schema.safeParse({ title: "", tiers: [{ name: "ok" }, { name: "" }] });
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(zodErrorToFieldErrors(r.error)).toEqual({ title: "uno", "tiers.1.name": "nombre" });
  });
});

describe("publishIssuesToFieldErrors", () => {
  it("AC24: cada problema va a su campo con su mensaje", () => {
    expect(
      publishIssuesToFieldErrors([
        { field: "title", code: "title-required" },
        { field: "date", code: "starts-at-past" },
        { field: "tiers", code: "no-tiers" },
      ]),
    ).toEqual({
      title: PUBLISH_MESSAGES["title-required"],
      date: PUBLISH_MESSAGES["starts-at-past"],
      tiers: PUBLISH_MESSAGES["no-tiers"],
    });
  });
});

describe("freezeIssuesToFieldErrors", () => {
  const tiers = [tier("a"), tier(undefined, "Nuevo"), tier("b", "VIP")];

  it("AC24: tierId → posición en el payload y campo bloqueado", () => {
    expect(
      freezeIssuesToFieldErrors(
        [
          { code: "tier-price-locked", tierId: "b" },
          { code: "tier-name-locked", tierId: "a" },
          { code: "tier-capacity-below-committed", tierId: "a", min: 7 },
        ],
        tiers,
      ),
    ).toEqual({
      "tiers.2.priceCents": FREEZE_MESSAGES["tier-price-locked"]({ code: "tier-price-locked" }),
      "tiers.0.name": FREEZE_MESSAGES["tier-name-locked"]({ code: "tier-name-locked" }),
      "tiers.0.capacity": FREEZE_MESSAGES["tier-capacity-below-committed"]({ code: "tier-capacity-below-committed", min: 7 }),
    });
  });

  it("AC24: tipo quitado (no está en el payload) → tiers; ajeno → su fila; repetido → última aparición", () => {
    const withDup = [tier("a"), tier("x"), tier("a", "Otro")];
    expect(
      freezeIssuesToFieldErrors(
        [
          { code: "tier-remove-locked", tierId: "gone" },
          { code: "tier-not-found", tierId: "x" },
          { code: "duplicate-tier-id", tierId: "a" },
        ],
        withDup,
      ),
    ).toEqual({
      tiers: FREEZE_MESSAGES["tier-remove-locked"]({ code: "tier-remove-locked" }),
      "tiers.1": FREEZE_MESSAGES["tier-not-found"]({ code: "tier-not-found" }),
      "tiers.2": FREEZE_MESSAGES["duplicate-tier-id"]({ code: "duplicate-tier-id" }),
    });
  });

  it("AC24: cambio de fecha o lugar sin confirmar → date", () => {
    expect(freezeIssuesToFieldErrors([{ code: "buyer-impact-unacknowledged" }], tiers)).toEqual({
      date: FREEZE_MESSAGES["buyer-impact-unacknowledged"]({ code: "buyer-impact-unacknowledged" }),
    });
  });
});
