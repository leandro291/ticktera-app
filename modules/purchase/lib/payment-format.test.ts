import { describe, expect, it } from "vitest";
import { formatCardNumber, formatCountdown, formatExpiry } from "./payment-format";

describe("payment formatting", () => {
  it("AC8: groups card digits in blocks of 4 and drops non-digits", () => {
    expect(formatCardNumber("4111111111111111")).toBe("4111 1111 1111 1111");
    expect(formatCardNumber("4111-11a1")).toBe("4111 111");
    expect(formatCardNumber("1".repeat(25)).replace(/ /g, "")).toHaveLength(19);
  });

  it("AC8: formats the expiry as MM/AA", () => {
    expect(formatExpiry("1")).toBe("1");
    expect(formatExpiry("12")).toBe("12");
    expect(formatExpiry("1228")).toBe("12/28");
    expect(formatExpiry("12/289")).toBe("12/28");
  });

  it("AC8: renders the countdown as mm:ss and never negative", () => {
    expect(formatCountdown(600)).toBe("10:00");
    expect(formatCountdown(59)).toBe("00:59");
    expect(formatCountdown(-3)).toBe("00:00");
  });
});
