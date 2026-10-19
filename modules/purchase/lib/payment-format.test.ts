import { describe, expect, it } from "vitest";
import { formatCountdown } from "./payment-format";

describe("payment formatting", () => {
  it("AC8: renders the countdown as mm:ss and never negative", () => {
    expect(formatCountdown(600)).toBe("10:00");
    expect(formatCountdown(59)).toBe("00:59");
    expect(formatCountdown(-3)).toBe("00:00");
  });
});
