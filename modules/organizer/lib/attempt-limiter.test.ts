import { describe, expect, it } from "vitest";
import { createAttemptLimiter } from "./attempt-limiter";

function setup() {
  let t = 1_000;
  const limiter = createAttemptLimiter({ max: 15, windowMs: 60_000, now: () => t });
  return { limiter, advance: (ms: number) => (t += ms) };
}

describe("createAttemptLimiter", () => {
  it("AC9: bloquea tras 15 fallos (el intento 16 ya está bloqueado)", () => {
    const { limiter } = setup();
    for (let i = 0; i < 14; i++) limiter.recordFailure("u1");
    expect(limiter.isBlocked("u1")).toBe(false);
    limiter.recordFailure("u1");
    expect(limiter.isBlocked("u1")).toBe(true);
  });

  it("AC9: reabre tras la ventana", () => {
    const { limiter, advance } = setup();
    for (let i = 0; i < 15; i++) limiter.recordFailure("u1");
    advance(59_999);
    expect(limiter.isBlocked("u1")).toBe(true);
    advance(2);
    expect(limiter.isBlocked("u1")).toBe(false);
  });

  it("AC9: las claves son independientes", () => {
    const { limiter } = setup();
    for (let i = 0; i < 15; i++) limiter.recordFailure("u1");
    expect(limiter.isBlocked("u1")).toBe(true);
    expect(limiter.isBlocked("u2")).toBe(false);
  });

  it("AC9: solo cuentan los fallos registrados (sin registrar no hay bloqueo)", () => {
    const { limiter } = setup();
    for (let i = 0; i < 100; i++) limiter.isBlocked("u1");
    expect(limiter.isBlocked("u1")).toBe(false);
  });
});
