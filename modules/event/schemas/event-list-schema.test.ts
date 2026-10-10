import { describe, expect, it } from "vitest";
import { eventListQuerySchema } from "./event-list-schema";

describe("eventListQuerySchema", () => {
  it("AC2: acepta los 3 scopes", () => {
    for (const scope of ["mine", "all", "published"]) {
      expect(eventListQuerySchema.safeParse({ scope }).success).toBe(true);
    }
  });

  it("AC2: rechaza scope ausente, vacío, en mayúsculas o desconocido", () => {
    expect(eventListQuerySchema.safeParse({}).success).toBe(false);
    expect(eventListQuerySchema.safeParse({ scope: null }).success).toBe(false);
    expect(eventListQuerySchema.safeParse({ scope: "" }).success).toBe(false);
    expect(eventListQuerySchema.safeParse({ scope: "ALL" }).success).toBe(false);
    expect(eventListQuerySchema.safeParse({ scope: "foo" }).success).toBe(false);
  });

  it("AC2: descarta parámetros extra como organizerId", () => {
    expect(eventListQuerySchema.parse({ scope: "mine", organizerId: "x" })).toEqual({
      scope: "mine",
    });
  });
});
