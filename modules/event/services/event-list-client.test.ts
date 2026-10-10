import { describe, expect, it } from "vitest";
import { EventListError, shouldRetryEvents } from "./event-list-client";

describe("shouldRetryEvents", () => {
  it("AC13: no reintenta 400/401/403", () => {
    expect(shouldRetryEvents(0, new EventListError(400, "invalid-query"))).toBe(false);
    expect(shouldRetryEvents(0, new EventListError(401, "unauthenticated"))).toBe(false);
    expect(shouldRetryEvents(0, new EventListError(403, "forbidden"))).toBe(false);
  });

  it("AC13: reintenta una vez un 500 o un error de red", () => {
    expect(shouldRetryEvents(0, new EventListError(500, "internal"))).toBe(true);
    expect(shouldRetryEvents(0, new TypeError("Failed to fetch"))).toBe(true);
  });

  it("AC13: no reintenta desde el segundo fallo", () => {
    expect(shouldRetryEvents(1, new EventListError(500, "internal"))).toBe(false);
    expect(shouldRetryEvents(1, new TypeError("Failed to fetch"))).toBe(false);
  });
});
