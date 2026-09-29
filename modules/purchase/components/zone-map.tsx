"use client";

import { formatPrice, type Currency } from "@/modules/event";
import { cn } from "@/lib/utils";
import { zoneColors } from "../lib/zone-style";
import type { MapRect, VenueLayout, ZoneTier } from "../types/venue";

interface ZoneMapProps {
  layout: VenueLayout;
  tiers: ZoneTier[];
  currency: Currency;
  selectedZoneId: string | null;
  onSelect: (zoneId: string) => void;
}

const place = (r: MapRect) => ({ left: `${r.x}%`, top: `${r.y}%`, width: `${r.width}%`, height: `${r.height}%` });

/** Clickable venue overview. Zones are positioned from layout data, so any venue shape renders from JSON. */
export function ZoneMap({ layout, tiers, currency, selectedZoneId, onSelect }: ZoneMapProps) {
  return (
    <div className="rounded-2xl bg-surface p-3 lg:rounded-[18px] lg:p-5">
      <div className="relative aspect-[1.05] w-full lg:aspect-[1.95]" role="group" aria-label="Mapa de zonas">
        <span
          className="absolute flex items-center justify-center rounded-[10px] bg-strong text-[10px] font-bold tracking-[0.16em] text-white lg:rounded-xl lg:text-xs"
          style={place(layout.stage)}
        >
          ESCENARIO
        </span>
        {tiers.map((tier) => {
          const soldOut = tier.status === "sold-out";
          const selected = tier.id === selectedZoneId;
          const price = soldOut ? "Agotado" : formatPrice(tier.price, currency);
          const narrow = tier.shape.width < 30;
          return (
            <button
              key={tier.id}
              type="button"
              aria-pressed={selected}
              aria-disabled={soldOut}
              aria-label={`${tier.name}, ${price}${tier.kind === "numbered" ? ", asientos numerados" : ""}`}
              onClick={() => !soldOut && onSelect(tier.id)}
              style={{ ...place(tier.shape), ...zoneColors(tier) }}
              className={cn(
                "absolute flex items-center justify-center gap-0.5 rounded-xl border-[3px] px-1 text-center transition-[filter] hover:brightness-95 lg:rounded-[14px]",
                narrow || tier.shape.height > 20 ? "flex-col" : "gap-2.5",
                selected ? "border-strong" : "border-transparent",
                soldOut && "cursor-not-allowed",
              )}
            >
              <span className="text-xs leading-tight font-semibold lg:text-[15px] lg:leading-tight">
                <span className="lg:hidden">{tier.shortName}</span>
                <span className="hidden lg:inline">{tier.name}</span>
              </span>
              <span className="text-[11px] lg:text-[13px]">{price}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
