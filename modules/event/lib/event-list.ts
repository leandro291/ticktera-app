import type {
  EventDbStatus,
  EventListItem,
  ManagedEventItem,
  TierSales,
} from "../types/event-list";

/** Una fila por (evento × tipo de entrada). Columnas tier* null si el evento no tiene tipos. */
export interface EventListRow {
  id: string;
  slug: string;
  title: string;
  categoryName: string;
  coverImageUrl: string | null;
  startsAt: Date;
  venueName: string;
  city: string;
  status: EventDbStatus;
  tierId: string | null;
  tierName: string | null;
  tierPriceCents: number | null;
  tierCapacity: number | null;
  tierSortOrder: number | null;
  tierSold?: string | number | null; // pg devuelve bigint/numeric como string; ausente en `published`
  tierRevenueCents?: string | number | null; // idem
}

/** Monto de pg (string o number) a number; lanza si no es entero seguro. */
function parseAmount(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const n = Number(value);
  if (!Number.isSafeInteger(n)) {
    throw new Error(`Invalid amount from database: ${String(value)}`);
  }
  return n;
}

interface Folded {
  item: EventListItem;
  tiers: (TierSales & { sortOrder: number })[];
}

/**
 * Pliega filas (evento × tipo de entrada) en eventos. Conserva el orden de primera aparición.
 * `includeSales: false` no emite la clave `sales` ni lee columnas de ventas.
 */
export function buildEventList(rows: EventListRow[], opts: { includeSales: true }): ManagedEventItem[];
export function buildEventList(rows: EventListRow[], opts: { includeSales: false }): EventListItem[];
export function buildEventList(
  rows: EventListRow[],
  opts: { includeSales: boolean },
): EventListItem[] | ManagedEventItem[] {
  const events = new Map<string, Folded>();

  for (const row of rows) {
    let folded = events.get(row.id);
    if (!folded) {
      folded = {
        item: {
          id: row.id,
          slug: row.slug,
          title: row.title,
          categoryName: row.categoryName,
          coverImageUrl: row.coverImageUrl,
          startsAt: row.startsAt.toISOString(),
          venueName: row.venueName,
          city: row.city,
          status: row.status,
          priceFromCents: null,
        },
        tiers: [],
      };
      events.set(row.id, folded);
    }
    if (row.tierId === null) continue;

    const priceCents = row.tierPriceCents ?? 0;
    const { item } = folded;
    item.priceFromCents =
      item.priceFromCents === null ? priceCents : Math.min(item.priceFromCents, priceCents);
    folded.tiers.push({
      id: row.tierId,
      name: row.tierName ?? "",
      priceCents,
      capacity: row.tierCapacity ?? 0,
      sold: opts.includeSales ? parseAmount(row.tierSold) : 0,
      revenueCents: opts.includeSales ? parseAmount(row.tierRevenueCents) : 0,
      sortOrder: row.tierSortOrder ?? 0,
    });
  }

  const list = [...events.values()];
  if (!opts.includeSales) return list.map(({ item }) => item);

  return list.map(({ item, tiers }): ManagedEventItem => {
    const sorted = tiers
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((t) => ({
        id: t.id,
        name: t.name,
        priceCents: t.priceCents,
        capacity: t.capacity,
        sold: t.sold,
        revenueCents: t.revenueCents,
      }));
    const total = (pick: (t: TierSales) => number) => {
      const sum = sorted.reduce((acc, t) => acc + pick(t), 0);
      if (!Number.isSafeInteger(sum)) throw new Error("Invalid aggregate amount");
      return sum;
    };
    return {
      ...item,
      sales: {
        sold: total((t) => t.sold),
        capacity: total((t) => t.capacity),
        revenueCents: total((t) => t.revenueCents),
        tiers: sorted,
      },
    };
  });
}
