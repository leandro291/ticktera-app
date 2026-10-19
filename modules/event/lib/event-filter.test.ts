import { describe, expect, it } from "vitest";
import type { EventSummary } from "../types/event";
import { cityOptions, filterEvents, MONTH_OPTIONS, pickFeatured, pickRelated } from "./event-filter";

const ev = (over: Partial<EventSummary>): EventSummary => ({
  id: "x",
  title: "Evento",
  category: "Conciertos",
  image: "/i.jpg",
  imageAlt: "",
  date: "2026-11-14",
  venue: "Estadio",
  city: "Lima",
  currency: "PEN",
  priceFrom: 100,
  status: "available",
  ...over,
});

const EVENTS = [
  ev({ id: "bad", title: "Bad Bunny — World Tour", date: "2026-11-14", priceFrom: 250 }),
  ev({ id: "sinf", title: "Concierto Sinfónico de Año Nuevo", city: "Arequipa", date: "2026-12-31", priceFrom: 95 }),
  ev({ id: "romeo", title: "Romeo y Julieta", category: "Teatro", city: "Arequipa", date: "2026-11-02", priceFrom: 60 }),
  ev({ id: "feria", title: "Feria Familiar", category: "Familiar", city: "Arequipa", date: "2026-12-01", priceFrom: 40 }),
  ev({ id: "circo", title: "Circo", category: "Familiar", date: "2026-11-22", priceFrom: 45 }),
];
const ids = (list: EventSummary[]) => list.map((e) => e.id);

describe("filterEvents", () => {
  it("AC6: sin filtros ordena por fecha", () => {
    expect(ids(filterEvents(EVENTS))).toEqual(["romeo", "bad", "circo", "feria", "sinf"]);
  });

  it("AC6: texto en título, lugar y ciudad, sin acentos ni mayúsculas", () => {
    expect(ids(filterEvents(EVENTS, { query: "bad bunny" }))).toEqual(["bad"]);
    expect(filterEvents(EVENTS, { query: "arequipa" })).toHaveLength(3);
    expect(ids(filterEvents(EVENTS, { query: "sinfonico" }))).toEqual(["sinf"]);
  });

  it("AC6: categoría y ciudad combinadas", () => {
    expect(ids(filterEvents(EVENTS, { categories: ["Conciertos"], cities: ["Lima"] }))).toEqual(["bad"]);
  });

  it("AC6: mes y rango de precio", () => {
    expect(filterEvents(EVENTS, { month: "11" })).toHaveLength(3);
    expect(ids(filterEvents(EVENTS, { price: "u50" }))).toEqual(["circo", "feria"]);
    expect(filterEvents(EVENTS, { price: "300" })).toHaveLength(0);
  });

  it("AC6: orden por precio", () => {
    const prices = filterEvents(EVENTS, { sort: "price" }).map((e) => e.priceFrom);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });
});

describe("MONTH_OPTIONS", () => {
  it("AC6: cualquier fecha más los 12 meses con clave de dos dígitos", () => {
    expect(MONTH_OPTIONS).toHaveLength(13);
    expect(MONTH_OPTIONS[1]).toEqual({ key: "01", label: "Enero" });
    expect(MONTH_OPTIONS[12]).toEqual({ key: "12", label: "Diciembre" });
  });
});

describe("pickFeatured / pickRelated / cityOptions", () => {
  it("AC4: destacados = próximos por fecha", () => {
    expect(ids(pickFeatured(EVENTS, 2))).toEqual(["romeo", "bad"]);
  });

  it("AC4: relacionados priorizan la categoría y excluyen el evento", () => {
    const related = pickRelated(EVENTS[3], EVENTS, 3); // feria (Familiar)
    expect(ids(related)).toEqual(["circo", "romeo", "bad"]);
    expect(ids(related)).not.toContain("feria");
  });

  it("AC6: ciudades únicas y ordenadas", () => {
    expect(cityOptions(EVENTS)).toEqual(["Arequipa", "Lima"]);
  });
});
