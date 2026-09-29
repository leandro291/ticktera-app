import { describe, expect, it } from "vitest";
import { parseEventSearchParams } from "./search-params";

describe("parseEventSearchParams", () => {
  it("AC2: reads query, repeated categories and filters from the URL", () => {
    expect(parseEventSearchParams({ q: "lima", category: ["Conciertos", "Teatro"], city: "Lima", month: "11", price: "u50" })).toEqual({
      query: "lima",
      filters: { categories: ["Conciertos", "Teatro"], cities: ["Lima"], month: "11", price: "u50" },
    });
  });

  it("AC2: ignores unknown values and falls back to defaults", () => {
    expect(parseEventSearchParams({ category: "Ópera", month: "13", price: "free" })).toEqual({
      query: "",
      filters: { categories: [], cities: [], month: "any", price: "any" },
    });
  });
});
