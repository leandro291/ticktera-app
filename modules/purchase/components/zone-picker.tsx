"use client";

import { ArmchairIcon, ChevronRightIcon, UsersIcon } from "lucide-react";
import { formatPrice, type Currency } from "@/modules/event";
import { cn } from "@/lib/utils";
import { zoneSwatch } from "../lib/zone-style";
import type { VenueLayout, ZoneTier } from "../types/venue";
import { ZoneMap } from "./zone-map";

interface ZonePickerProps {
  layout: VenueLayout;
  tiers: ZoneTier[];
  currency: Currency;
  quantityOf: (zoneId: string) => number;
  highlightedZoneId: string | null;
  onHighlight: (zoneId: string | null) => void;
  onSelect: (zoneId: string) => void;
}

/** Step 1: venue map + one card per zone. Hovering or focusing either side highlights the zone on both. */
export function ZonePicker({ layout, tiers, currency, quantityOf, highlightedZoneId, onHighlight, onSelect }: ZonePickerProps) {
  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <ZoneMap
        layout={layout}
        tiers={tiers}
        currency={currency}
        highlightedZoneId={highlightedZoneId}
        onHighlight={onHighlight}
        onSelect={onSelect}
        quantityOf={quantityOf}
      />

      <ul aria-label="Zonas" className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:gap-3" onPointerLeave={() => onHighlight(null)}>
        {tiers.map((tier) => {
          const soldOut = tier.status === "sold-out";
          const numbered = tier.kind === "numbered";
          const chosen = quantityOf(tier.id);
          const highlighted = tier.id === highlightedZoneId;
          const TypeIcon = numbered ? ArmchairIcon : UsersIcon;
          return (
            <li key={tier.id}>
              <button
                type="button"
                disabled={soldOut}
                onClick={() => onSelect(tier.id)}
                onPointerEnter={() => onHighlight(tier.id)}
                onFocus={() => onHighlight(tier.id)}
                onBlur={() => onHighlight(null)}
                aria-label={`${tier.name}, ${soldOut ? "agotado" : formatPrice(tier.price, currency)}, ${numbered ? "numerada" : "general"}${chosen ? `, ${chosen} elegidas` : ""}`}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border-[1.5px] bg-card p-3.5 text-left transition-[border-color,box-shadow] lg:p-4",
                  soldOut ? "cursor-not-allowed border-border opacity-60" : highlighted ? "border-strong shadow-[0_8px_20px_-14px_rgba(24,24,27,.5)]" : chosen ? "border-primary" : "border-border",
                )}
              >
                <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ background: zoneSwatch(tier) }} aria-hidden />
                <span className="flex min-w-0 grow flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-[15px] font-semibold">{tier.name}</span>
                    {tier.status === "last-tickets" && (
                      <span className="flex h-[22px] items-center rounded-full bg-warning px-2 text-[11px] font-semibold text-warning-foreground">Quedan pocas</span>
                    )}
                    {chosen > 0 && (
                      <span className="flex h-[22px] items-center rounded-full bg-accent px-2 text-[11px] font-semibold text-accent-foreground">
                        {chosen} elegida{chosen > 1 ? "s" : ""}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    <TypeIcon className="size-3.5 shrink-0" aria-hidden />
                    {numbered ? "Numerada · eliges tu butaca" : "General · sin butaca"}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  {soldOut ? (
                    <span className="rounded-lg bg-muted px-2.5 py-1 text-[13px] font-semibold text-muted-foreground">Agotado</span>
                  ) : (
                    <span className="flex flex-col items-end">
                      <span className="text-[11px] text-muted-foreground">c/u</span>
                      <span className="text-base font-bold text-price tabular-nums">{formatPrice(tier.price, currency)}</span>
                    </span>
                  )}
                  {!soldOut && <ChevronRightIcon className="size-5 text-muted-foreground" aria-hidden />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
