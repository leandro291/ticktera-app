import { describe, expect, it } from "vitest";
import { filterEvents, getEvents, getFeaturedEvents } from "./event-service";
import { EVENTS } from "../data/events";

const titles = (list: { title: string }[]) => list.map((e) => e.title);

describe("event-service", () => {
  it("AC2: returns every mock event sorted by date by default", async () => {
    const events = await getEvents();
    expect(events).toHaveLength(10);
    expect(events.map((e) => e.date)).toEqual([...events.map((e) => e.date)].sort());
  });

  it("AC2: text search matches title, venue and city, ignoring accents and case", () => {
    expect(titles(filterEvents(EVENTS, { query: "bad bunny" }))).toEqual(["Bad Bunny — World Tour"]);
    expect(filterEvents(EVENTS, { query: "arequipa" })).toHaveLength(3);
    expect(titles(filterEvents(EVENTS, { query: "sinfonico" }))).toEqual(["Concierto Sinfónico de Año Nuevo"]);
  });

  it("AC2: filters by category and city combined", () => {
    const result = filterEvents(EVENTS, { categories: ["Conciertos"], cities: ["Lima"] });
    expect(titles(result)).toEqual(["Bad Bunny — World Tour"]);
  });

  it("AC2: filters by month and price range", () => {
    expect(filterEvents(EVENTS, { month: "10" })).toHaveLength(3);
    const cheap = filterEvents(EVENTS, { price: "u50" });
    expect(cheap.every((e) => e.priceFrom <= 50)).toBe(true);
    expect(cheap).toHaveLength(2);
    expect(filterEvents(EVENTS, { price: "300" })).toHaveLength(0);
  });

  it("AC2: sorts by lowest price", () => {
    const prices = filterEvents(EVENTS, { sort: "price" }).map((e) => e.priceFrom);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it("AC0: featured events keep the design order", async () => {
    expect((await getFeaturedEvents()).map((e) => e.id)).toEqual(["evt-001", "evt-002", "evt-004", "evt-005", "evt-007"]);
  });
});
