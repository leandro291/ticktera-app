import { describe, expect, it } from "vitest";
import { PLACEHOLDER_IMAGE, toEventDetails, toPublicEvents, type CatalogRow } from "./catalog-mapper";

const row = (over: Partial<CatalogRow>): CatalogRow => ({
  slug: "rock",
  title: "Rock",
  categoryName: "Conciertos",
  coverImageUrl: "https://x.public.blob.vercel-storage.com/a.jpg",
  startsAt: new Date("2026-11-15T02:00:00.000Z"), // 14 nov 21:00 en Lima
  venueName: "Estadio",
  address: "Av. 1",
  city: "Lima",
  description: "Show",
  tierId: "t1",
  tierName: "General",
  tierPriceCents: 5000,
  tierCapacity: 100,
  tierMaxPerOrder: 6,
  tierPaid: 0,
  tierReserved: 0,
  ...over,
});

describe("toPublicEvents", () => {
  it("AC2: agrupa por slug conservando el orden y arma la vista", () => {
    const [rock, jazz] = toPublicEvents([
      row({}),
      row({ tierId: "t2", tierName: "VIP", tierPriceCents: 12000, tierCapacity: 20 }),
      row({ slug: "jazz", title: "Jazz", tierId: "t3" }),
    ]);
    expect(rock.tiers.map((t) => t.id)).toEqual(["t1", "t2"]);
    expect(jazz.event.id).toBe("jazz");
    expect(rock.event).toMatchObject({
      id: "rock",
      category: "Conciertos",
      date: "2026-11-14",
      startTime: "21:00",
      currency: "PEN",
      priceFrom: 50,
      imageAlt: "Portada de «Rock»",
      address: "Av. 1",
    });
  });

  it("AC2: sin portada usa el placeholder; nulos → texto vacío", () => {
    const [{ event }] = toPublicEvents([row({ coverImageUrl: null, address: null, description: null })]);
    expect(event).toMatchObject({ image: PLACEHOLDER_IMAGE, address: "", description: "" });
  });

  it("AC2: cupo, estado de zona y de evento, y 'Desde' entre zonas con cupo", () => {
    const [{ event, tiers }] = toPublicEvents([
      row({ tierId: "a", tierPriceCents: 3000, tierCapacity: 10, tierPaid: 7, tierReserved: 3 }),
      row({ tierId: "b", tierPriceCents: 8000, tierCapacity: 100, tierPaid: 92 }),
    ]);
    expect(tiers.map((t) => [t.available, t.status])).toEqual([
      [0, "sold-out"],
      [8, "last-tickets"],
    ]);
    expect(event.status).toBe("last-tickets");
    expect(event.priceFrom).toBe(80);
  });

  it("AC2: evento sin tipos de entrada → agotado y precio 0", () => {
    const [{ event, tiers }] = toPublicEvents([row({ tierId: null, tierName: null, tierPriceCents: null, tierCapacity: null, tierMaxPerOrder: null })]);
    expect(tiers).toEqual([]);
    expect(event).toMatchObject({ status: "sold-out", priceFrom: 0 });
  });

  it("AC2: toEventDetails devuelve solo las vistas", () => {
    expect(toEventDetails([row({})]).map((e) => e.id)).toEqual(["rock"]);
  });
});
