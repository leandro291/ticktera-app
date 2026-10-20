import { describe, expect, it } from "vitest";
import { isoToLimaDate, isoToLimaTime } from "@/modules/event";
import type { Order } from "@/modules/purchase";
import { splitOrdersByDate } from "./split-orders";

const TODAY = "2026-10-19";

const order = (code: string, date: string, startTime?: string): Order => ({
  code,
  event: { id: "e1", title: "Evento", category: "Música", image: "", date, startTime, venue: "Sala", city: "Lima" },
  currency: "PEN",
  items: [],
  total: 0,
  count: 1,
  buyerName: "Ana",
  email: "ana@example.com",
  paymentMethod: "card",
  tickets: [],
});

const codes = (orders: Order[]) => orders.map((o) => o.code);

describe("splitOrdersByDate", () => {
  it("AC10: today is upcoming, yesterday is past, tomorrow is upcoming", () => {
    const { upcoming, past } = splitOrdersByDate(
      [order("YESTERDAY", "2026-10-18"), order("TODAY", TODAY), order("TOMORROW", "2026-10-20")],
      TODAY,
    );
    expect(codes(upcoming)).toEqual(["TODAY", "TOMORROW"]);
    expect(codes(past)).toEqual(["YESTERDAY"]);
  });

  it("AC10: an event at 22:30 Lima (already the next day in UTC) stays upcoming on its Lima day", () => {
    const startsAt = "2026-10-20T03:30:00Z";
    const late = order("LATE", isoToLimaDate(startsAt), isoToLimaTime(startsAt));
    expect(late.event.date).toBe(TODAY);
    expect(codes(splitOrdersByDate([late], TODAY).upcoming)).toEqual(["LATE"]);
    expect(codes(splitOrdersByDate([late], "2026-10-20").past)).toEqual(["LATE"]);
  });

  it("AC10: orders the same day by start time (upcoming ascending, past descending)", () => {
    const up = splitOrdersByDate([order("N", TODAY, "21:00"), order("M", TODAY, "10:00"), order("D", "2026-10-21", "09:00")], TODAY);
    expect(codes(up.upcoming)).toEqual(["M", "N", "D"]);

    const past = splitOrdersByDate([order("A", "2026-10-10", "10:00"), order("C", "2026-10-11", "09:00"), order("B", "2026-10-10", "21:00")], TODAY);
    expect(codes(past.past)).toEqual(["C", "B", "A"]);
  });

  it("AC10: ties keep the input order", () => {
    const { upcoming } = splitOrdersByDate([order("FIRST", TODAY, "20:00"), order("SECOND", TODAY, "20:00")], TODAY);
    expect(codes(upcoming)).toEqual(["FIRST", "SECOND"]);
  });

  it("AC10: an empty list gives empty tabs", () => {
    expect(splitOrdersByDate([], TODAY)).toEqual({ upcoming: [], past: [] });
  });
});
