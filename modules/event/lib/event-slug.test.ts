import { describe, expect, it } from "vitest";
import { slugBase, slugify, uniqueSlug } from "./event-slug";

describe("slugify", () => {
  it("AC13: quita acentos y símbolos (mismos casos que el seed)", () => {
    expect(slugify("Ciudad de México")).toBe("ciudad-de-mexico");
    expect(slugify("  ¡Rock & Pop 2026!  ")).toBe("rock-pop-2026");
    expect(slugify("Ñandú")).toBe("nandu");
  });
});

describe("slugBase", () => {
  it("AC13: recorta a 60 sin guion final", () => {
    const base = slugBase(`${"a".repeat(59)} bcd`);
    expect(base).toBe("a".repeat(59));
    expect(base.length).toBeLessThanOrEqual(60);
    expect(slugBase("x".repeat(80))).toHaveLength(60);
  });

  it("AC13: título sin caracteres útiles → evento", () => {
    expect(slugBase("¡¡¡")).toBe("evento");
    expect(slugBase("")).toBe("evento");
  });
});

describe("uniqueSlug", () => {
  it("AC13: libre → el base", () => {
    expect(uniqueSlug("rock", new Set(), () => "zzzzz")).toBe("rock");
  });

  it("AC13: ocupado → con sufijo", () => {
    expect(uniqueSlug("rock", new Set(["rock"]), () => "a1b2c")).toBe("rock-a1b2c");
  });

  it("AC13: sufijo ocupado → reintenta con el siguiente random", () => {
    const suffixes = ["aaaaa", "bbbbb"];
    expect(uniqueSlug("rock", new Set(["rock", "rock-aaaaa"]), () => suffixes.shift()!)).toBe("rock-bbbbb");
  });
});
