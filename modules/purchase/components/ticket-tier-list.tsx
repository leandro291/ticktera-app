"use client";

import { ArmchairIcon, MinusIcon, PlusIcon } from "lucide-react";
import { formatPrice, type Currency } from "@/modules/event";
import { cn } from "@/lib/utils";
import { MAX_TICKETS_PER_ZONE } from "../data/venues";
import { zoneSwatch } from "../lib/zone-style";
import type { ZoneTier } from "../types/venue";

interface TicketTierListProps {
  tiers: ZoneTier[];
  currency: Currency;
  selectedZoneId: string | null;
  quantityOf: (zoneId: string) => number;
  onQuantityChange: (zoneId: string, quantity: number) => void;
  /** Numbered zones pick seats on the map instead of a quantity stepper. */
  onPickSeats: (zoneId: string) => void;
}

const stepButton = "flex size-10 items-center justify-center rounded-[11px]";

export function TicketTierList({ tiers, currency, selectedZoneId, quantityOf, onQuantityChange, onPickSeats }: TicketTierListProps) {
  return (
    <section className="flex flex-col rounded-[22px] border border-border bg-card px-4 py-1 lg:rounded-3xl lg:px-7 lg:py-2">
      <h2 className="pt-4 pb-2 text-lg font-semibold lg:text-xl">Entradas</h2>
      <ul className="flex flex-col">
        {tiers.map((tier) => {
          const quantity = quantityOf(tier.id);
          const soldOut = tier.status === "sold-out";
          const full = quantity >= MAX_TICKETS_PER_ZONE;
          return (
            <li
              key={tier.id}
              className={cn(
                "-mx-3 flex flex-col rounded-[14px] border-t border-divider px-3 py-3 lg:min-h-[76px] lg:justify-center",
                tier.id === selectedZoneId && "bg-accent",
              )}
            >
              <div className="flex items-center gap-3 lg:gap-4">
                <span className="size-3.5 shrink-0 rounded-[4px]" style={{ background: zoneSwatch(tier) }} aria-hidden />
                <span className="flex grow flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-semibold lg:text-base">
                    {tier.name}
                    {tier.status === "last-tickets" && (
                      <span className="flex h-6 items-center rounded-full bg-warning px-2 text-[11px] font-semibold text-warning-foreground">
                        Últimas entradas
                      </span>
                    )}
                  </span>
                  <span className="text-[13px] text-muted-foreground lg:text-sm">
                    {formatPrice(tier.price, currency)} c/u{tier.kind === "numbered" && " · numerada"}
                  </span>
                </span>

                {soldOut ? (
                  <span className="flex h-11 items-center rounded-xl bg-muted px-4 text-sm font-semibold text-muted-foreground">Agotado</span>
                ) : tier.kind === "numbered" ? (
                  <button
                    type="button"
                    onClick={() => onPickSeats(tier.id)}
                    className={cn(
                      "flex h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold",
                      quantity ? "bg-strong text-white" : "border-[1.5px] border-strong",
                    )}
                  >
                    <ArmchairIcon className="size-[18px]" aria-hidden />
                    {quantity ? `${quantity} · Cambiar` : "Elegir butacas"}
                  </button>
                ) : (
                  <span className="flex shrink-0 items-center gap-1 rounded-[14px] border border-border p-[3px]">
                    <button
                      type="button"
                      aria-label={`Quitar una entrada de ${tier.name}`}
                      disabled={quantity === 0}
                      onClick={() => onQuantityChange(tier.id, quantity - 1)}
                      className={cn(stepButton, "bg-muted text-foreground disabled:cursor-not-allowed disabled:opacity-40")}
                    >
                      <MinusIcon className="size-[18px]" aria-hidden />
                    </button>
                    <span aria-live="polite" className="w-8 text-center text-base font-semibold tabular-nums">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={`Agregar una entrada de ${tier.name}`}
                      disabled={full}
                      onClick={() => onQuantityChange(tier.id, quantity + 1)}
                      className={cn(stepButton, "bg-strong text-white disabled:cursor-not-allowed disabled:opacity-40")}
                    >
                      <PlusIcon className="size-[18px]" aria-hidden />
                    </button>
                  </span>
                )}
              </div>
              {full && !soldOut && (
                <p role="status" className="mt-2 pl-[26px] text-[13px] font-medium text-warning-foreground lg:pl-[30px]">
                  Llegaste al máximo de {MAX_TICKETS_PER_ZONE} entradas en esta zona.
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="border-t border-divider pt-3.5 pb-[18px] text-[13px] text-muted-foreground">
        Máximo {MAX_TICKETS_PER_ZONE} entradas por zona.
      </p>
    </section>
  );
}
