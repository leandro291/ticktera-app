import { formatPrice, type Currency } from "@/modules/event";
import { cn } from "@/lib/utils";
import type { ZoneTier } from "../types/venue";
import { zoneSwatch } from "../lib/zone-style";

/** Read-only zone/price list for the event detail page. */
export function ZonePriceList({ tiers, currency }: { tiers: ZoneTier[]; currency: Currency }) {
  return (
    <ul className="flex flex-col lg:border-t lg:border-divider">
      {tiers.map((tier) => {
        const soldOut = tier.status === "sold-out";
        return (
          <li key={tier.id} className="flex min-h-[54px] items-center justify-between gap-3 border-b border-divider lg:min-h-14">
            <span className="flex items-center gap-2.5">
              <span className="size-3 shrink-0 rounded-[4px]" style={{ background: zoneSwatch(tier) }} aria-hidden />
              <span className={cn("text-[15px] font-medium", soldOut && "text-muted-foreground")}>{tier.name}</span>
              {tier.status === "last-tickets" && (
                <span className="flex h-[22px] items-center rounded-full bg-warning px-2 text-[11px] font-semibold text-warning-foreground lg:h-6">
                  Últimas
                </span>
              )}
            </span>
            {soldOut ? (
              <span className="text-sm font-semibold text-muted-foreground">Agotado</span>
            ) : (
              <span className="text-[15px] font-semibold">{formatPrice(tier.price, currency)}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
