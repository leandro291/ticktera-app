import { describe, expect, it } from "vitest";
import { applyRefundState, decideSucceeded, isLatePayment } from "./late-payment";

const now = new Date("2026-10-19T12:00:00Z");
const future = new Date("2026-12-01T20:00:00Z");
const past = new Date("2026-10-19T11:00:00Z");
const before = new Date("2026-10-19T11:59:00Z");
const after = new Date("2026-10-19T12:01:00Z");

type Input = Parameters<typeof decideSucceeded>[0];
const decide = (o: { status?: Input["order"]["status"]; expiresAt?: Date; event?: Input["event"]; items?: Input["items"] } = {}) =>
  decideSucceeded({
    order: { status: o.status ?? "expired", expiresAt: o.expiresAt ?? before },
    now,
    event: o.event ?? { status: "published", startsAt: future },
    items: o.items ?? [{ quantity: 2, tier: { capacity: 10, paid: 4, reserved: 4 } }],
  });

describe("decideSucceeded", () => {
  it("AC16: pending vigente se honra", () => {
    expect(decide({ status: "pending", expiresAt: after })).toEqual({ action: "issue" });
  });

  it("AC16: pending vigente se honra aunque el evento esté cancelado, suspendido o pasado y sin cupo", () => {
    const items = [{ quantity: 2, tier: { capacity: 2, paid: 2, reserved: 2 } }];
    for (const event of [
      { status: "cancelled", startsAt: future },
      { status: "suspended", startsAt: future },
      { status: "published", startsAt: past },
    ]) {
      expect(decide({ status: "pending", expiresAt: after, event, items })).toEqual({ action: "issue" });
    }
  });

  it("AC16: pending con expires_at exactamente ahora es tardía (cupo: se honra)", () => {
    expect(decide({ status: "pending", expiresAt: now })).toEqual({ action: "issue" });
  });

  it("AC16: pending con expires_at exactamente ahora es tardía (sin cupo: reembolso)", () => {
    const items = [{ quantity: 2, tier: { capacity: 10, paid: 5, reserved: 4 } }];
    expect(decide({ status: "pending", expiresAt: now, items })).toEqual({ action: "refund", reason: "no-capacity" });
  });

  it("AC16: pending vencida sin job (expires_at pasado) se evalúa como tardía", () => {
    const items = [{ quantity: 2, tier: { capacity: 10, paid: 5, reserved: 4 } }];
    expect(decide({ status: "pending", expiresAt: before, items })).toEqual({ action: "refund", reason: "no-capacity" });
    expect(decide({ status: "pending", expiresAt: before })).toEqual({ action: "issue" });
  });

  it("AC16: tardía con cupo justo se honra", () => {
    const items = [{ quantity: 2, tier: { capacity: 10, paid: 4, reserved: 4 } }];
    expect(decide({ items })).toEqual({ action: "issue" });
  });

  it("AC16: tardía con cupo menos uno se reembolsa", () => {
    const items = [{ quantity: 2, tier: { capacity: 10, paid: 5, reserved: 4 } }];
    expect(decide({ items })).toEqual({ action: "refund", reason: "no-capacity" });
  });

  it("AC16: con varios tipos basta uno sin cupo para reembolsar", () => {
    const items = [
      { quantity: 1, tier: { capacity: 10, paid: 0, reserved: 0 } },
      { quantity: 3, tier: { capacity: 5, paid: 2, reserved: 1 } },
    ];
    expect(decide({ items })).toEqual({ action: "refund", reason: "no-capacity" });
  });

  it("AC16: capacidad − pagadas − reservadas negativa cuenta como 0 (reembolso)", () => {
    const items = [{ quantity: 1, tier: { capacity: 2, paid: 3, reserved: 1 } }];
    expect(decide({ items })).toEqual({ action: "refund", reason: "no-capacity" });
  });

  it("AC16: tardía con evento cancelado, suspendido o borrador se reembolsa", () => {
    for (const status of ["cancelled", "suspended", "draft"]) {
      expect(decide({ event: { status, startsAt: future } })).toEqual({ action: "refund", reason: "event-unavailable" });
    }
  });

  it("AC16: tardía con evento pasado o empezando ahora se reembolsa (futuro estrictamente)", () => {
    expect(decide({ event: { status: "published", startsAt: past } })).toEqual({ action: "refund", reason: "event-unavailable" });
    expect(decide({ event: { status: "published", startsAt: now } })).toEqual({ action: "refund", reason: "event-unavailable" });
  });

  it("AC16: evento no vendible gana sobre falta de cupo", () => {
    const items = [{ quantity: 2, tier: { capacity: 2, paid: 2, reserved: 0 } }];
    expect(decide({ event: { status: "cancelled", startsAt: future }, items })).toEqual({
      action: "refund",
      reason: "event-unavailable",
    });
  });

  it("AC16: orden ya paid o refunded es noop (idempotencia), sin importar vigencia, evento o cupo", () => {
    const items = [{ quantity: 9, tier: { capacity: 1, paid: 1, reserved: 0 } }];
    const event = { status: "cancelled", startsAt: past };
    for (const status of ["paid", "refunded"] as const) {
      expect(decide({ status, expiresAt: after, event, items })).toEqual({ action: "noop" });
      expect(decide({ status, expiresAt: before, event, items })).toEqual({ action: "noop" });
    }
  });
});

describe("isLatePayment", () => {
  it("AC16: expired es tardía siempre", () => {
    expect(isLatePayment({ status: "expired", expiresAt: after }, now)).toBe(true);
    expect(isLatePayment({ status: "expired", expiresAt: before }, now)).toBe(true);
  });

  it("AC16: pending es tardía solo si expires_at <= ahora", () => {
    expect(isLatePayment({ status: "pending", expiresAt: before }, now)).toBe(true);
    expect(isLatePayment({ status: "pending", expiresAt: now }, now)).toBe(true);
    expect(isLatePayment({ status: "pending", expiresAt: after }, now)).toBe(false);
  });

  it("AC16: paid y refunded no son tardías (ya cerradas)", () => {
    for (const status of ["paid", "refunded"] as const) expect(isLatePayment({ status, expiresAt: before }, now)).toBe(false);
  });
});

describe("applyRefundState", () => {
  const issue = { action: "issue" } as const;
  const refund = { action: "refund", reason: "no-capacity" } as const;
  const noop = { action: "noop" } as const;

  it("AC16: sin reembolsos (amount_refunded 0 o sin charge) la decisión no cambia", () => {
    const c = { amount: 3000, amountRefunded: 0 };
    expect(applyRefundState(issue, c)).toEqual({ action: "issue" });
    expect(applyRefundState(refund, c)).toEqual({ action: "refund", callStripe: true });
    expect(applyRefundState(noop, c)).toEqual({ action: "noop" });
  });

  it("AC16: issue con reembolso total no emite", () => {
    expect(applyRefundState(issue, { amount: 3000, amountRefunded: 3000 })).toEqual({ action: "already-refunded", partial: false });
  });

  it("AC16: issue con reembolso parcial no emite (criterio seguro) y lo marca parcial", () => {
    expect(applyRefundState(issue, { amount: 3000, amountRefunded: 1 })).toEqual({ action: "already-refunded", partial: true });
  });

  it("AC16: refund con reembolso total no llama a Stripe", () => {
    expect(applyRefundState(refund, { amount: 3000, amountRefunded: 3000 })).toEqual({ action: "refund", callStripe: false });
    expect(applyRefundState(refund, { amount: 3000, amountRefunded: 3500 })).toEqual({ action: "refund", callStripe: false });
  });

  it("AC16: refund con reembolso parcial sí llama a Stripe (devuelve solo el resto)", () => {
    expect(applyRefundState(refund, { amount: 3000, amountRefunded: 1000 })).toEqual({ action: "refund", callStripe: true });
  });

  it("AC16: noop se respeta aunque haya reembolso", () => {
    expect(applyRefundState(noop, { amount: 3000, amountRefunded: 3000 })).toEqual({ action: "noop" });
  });
});
