"use client";

import { formatPrice, type Currency } from "@/modules/event";
import { cn } from "@/lib/utils";
import { zoneColors } from "../lib/zone-style";
import type { MapRect, VenueLayout, ZoneTier } from "../types/venue";

interface ZoneMapProps {
  layout: VenueLayout;
  tiers: ZoneTier[];
  currency: Currency;
  /** Zone highlighted from the zone cards (hover / focus). */
  highlightedZoneId: string | null;
  onHighlight: (zoneId: string | null) => void;
  onSelect: (zoneId: string) => void;
}

const place = (r: MapRect) => ({ left: `${r.x}%`, top: `${r.y}%`, width: `${r.width}%`, height: `${r.height}%` });

const SOLD_OUT_STRIPES = "repeating-linear-gradient(135deg, transparent 0 7px, rgba(82,82,91,.14) 7px 9px)";

/** Clickable venue overview. Zones are positioned from layout data, so any venue shape renders from JSON. */
export function ZoneMap({ layout, tiers, currency, highlightedZoneId, onHighlight, onSelect }: ZoneMapProps) {
  return (
    <div className="rounded-2xl bg-surface p-3 lg:rounded-[18px] lg:p-5">
      <div className="relative aspect-[1.05] w-full lg:aspect-[2.1]" role="group" aria-label="Mapa de zonas" onPointerLeave={() => onHighlight(null)}>
        <span
          className="absolute flex items-center justify-center rounded-[10px] bg-stage text-[10px] font-bold tracking-[0.16em] text-white lg:rounded-xl lg:text-xs"
          style={place(layout.stage)}
        >
          ESCENARIO
        </span>
        {tiers.map((tier) => {
          const soldOut = tier.status === "sold-out";
          const highlighted = tier.id === highlightedZoneId;
          const dimmed = highlightedZoneId !== null && !highlighted;
          const price = soldOut ? "Agotado" : formatPrice(tier.price, currency);
          const narrow = tier.shape.width < 30;
          return (
            <button
              key={tier.id}
              type="button"
              aria-disabled={soldOut}
              aria-label={`${tier.name}, ${price}${tier.kind === "numbered" ? ", asientos numerados" : ""}`}
              onClick={() => !soldOut && onSelect(tier.id)}
              onPointerEnter={() => onHighlight(tier.id)}
              onFocus={() => onHighlight(tier.id)}
              onBlur={() => onHighlight(null)}
              style={{ ...place(tier.shape), ...zoneColors(tier), ...(soldOut ? { backgroundImage: SOLD_OUT_STRIPES } : {}) }}
              className={cn(
                "absolute flex items-center justify-center gap-0.5 rounded-xl border-[3px] px-1 text-center transition-[opacity,transform,border-color] duration-150 lg:rounded-[14px]",
                narrow || tier.shape.height > 20 ? "flex-col" : "gap-2.5",
                highlighted && !soldOut ? "z-10 border-strong motion-safe:scale-[1.02]" : "border-transparent",
                dimmed && "opacity-60",
                soldOut ? "cursor-not-allowed" : "cursor-pointer",
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
