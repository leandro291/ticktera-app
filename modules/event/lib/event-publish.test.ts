import { describe, expect, it } from "vitest";
import { checkPublishable, PUBLISH_MESSAGES, type PublishIssueCode } from "./event-publish";

const NOW = new Date("2026-10-09T20:00:00.000Z");
const VALID = {
  title: "Concierto",
  categoryId: "3f1c2a8e-0b7d-4c55-9a43-0e2f6d1b9c10",
  venueName: "Estadio Nacional",
  city: "Lima",
  startsAt: new Date("2026-11-15T02:00:00.000Z"),
  tiers: [{ capacity: 100 }],
};
const codes = (issues: { code: PublishIssueCode }[]) => issues.map((i) => i.code);

describe("checkPublishable", () => {
  it("AC7: evento válido → sin problemas", () => {
    expect(checkPublishable(VALID, NOW, { checkDate: true })).toEqual([]);
  });

  it("AC7: cada problema por separado, con su campo", () => {
    expect(checkPublishable({ ...VALID, title: "  " }, NOW, { checkDate: true })).toEqual([{ field: "title", code: "title-required" }]);
    expect(checkPublishable({ ...VALID, categoryId: null }, NOW, { checkDate: true })).toEqual([{ field: "categoryId", code: "category-required" }]);
    expect(checkPublishable({ ...VALID, categoryId: "" }, NOW, { checkDate: true })).toEqual([{ field: "categoryId", code: "category-required" }]);
    expect(checkPublishable({ ...VALID, venueName: "" }, NOW, { checkDate: true })).toEqual([{ field: "venueName", code: "venue-required" }]);
    expect(checkPublishable({ ...VALID, city: " " }, NOW, { checkDate: true })).toEqual([{ field: "city", code: "city-required" }]);
    expect(checkPublishable({ ...VALID, tiers: [] }, NOW, { checkDate: true })).toEqual([{ field: "tiers", code: "no-tiers" }]);
    expect(checkPublishable({ ...VALID, tiers: [{ capacity: 0 }, { capacity: 0 }] }, NOW, { checkDate: true })).toEqual([
      { field: "tiers", code: "no-capacity" },
    ]);
  });

  it("AC7: devuelve varios problemas a la vez", () => {
    const issues = checkPublishable({ ...VALID, title: "", city: "", tiers: [], startsAt: new Date("2020-01-01") }, NOW, { checkDate: true });
    expect(codes(issues)).toEqual(["title-required", "city-required", "starts-at-past", "no-tiers"]);
  });

  it("AC7: la fecha tiene que ser posterior a ahora (igual a now no vale, 1 ms después sí)", () => {
    expect(codes(checkPublishable({ ...VALID, startsAt: new Date(NOW) }, NOW, { checkDate: true }))).toEqual(["starts-at-past"]);
    expect(checkPublishable({ ...VALID, startsAt: new Date(NOW.getTime() + 1) }, NOW, { checkDate: true })).toEqual([]);
    expect(codes(checkPublishable({ ...VALID, startsAt: new Date("invalid") }, NOW, { checkDate: true }))).toEqual(["starts-at-past"]);
  });

  it("AC7: checkDate false ignora una fecha pasada", () => {
    expect(checkPublishable({ ...VALID, startsAt: new Date("2020-01-01") }, NOW, { checkDate: false })).toEqual([]);
  });

  it("AC7: PUBLISH_MESSAGES cubre todos los códigos", () => {
    const all: PublishIssueCode[] = ["title-required", "category-required", "venue-required", "city-required", "starts-at-past", "no-tiers", "no-capacity"];
    for (const code of all) expect(PUBLISH_MESSAGES[code]).toBeTruthy();
  });
});
