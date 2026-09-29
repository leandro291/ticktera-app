"use client";

import { MinusIcon, PlusIcon, UsersIcon } from "lucide-react";
import { formatPrice, type Currency } from "@/modules/event";
import { MAX_TICKETS_PER_ZONE } from "../data/venues";
import type { ZoneTier } from "../types/venue";

interface GaQuantityProps {
  tier: ZoneTier;
  currency: Currency;
  quantity: number;
  onChange: (quantity: number) => void;
}

const stepButton = "flex size-12 items-center justify-center rounded-[14px] disabled:cursor-not-allowed disabled:opacity-40";

/** Step 2 for general admission zones: how many tickets, with unit price, subtotal and the per-zone limit. */
export function GaQuantity({ tier, currency, quantity, onChange }: GaQuantityProps) {
  const full = quantity >= MAX_TICKETS_PER_ZONE;
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-surface p-4 lg:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px]" style={{ background: tier.color, color: tier.textColor }}>
          <UsersIcon className="size-5" aria-hidden />
        </span>
        <div className="flex flex-col">
          <span className="text-base font-semibold">Entrada general</span>
          <span className="text-[13px] text-muted-foreground">Sin butaca asignada: ingresas por orden de llegada.</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-3 pl-4">
        <span className="flex flex-col">
          <span className="text-[13px] text-muted-foreground">Precio c/u</span>
          <span className="text-lg font-bold text-price tabular-nums">{formatPrice(tier.price, currency)}</span>
        </span>
        <span className="flex items-center gap-2">
          <button type="button" aria-label={`Quitar una entrada de ${tier.name}`} disabled={quantity === 0} onClick={() => onChange(quantity - 1)} className={`${stepButton} bg-muted text-foreground`}>
            <MinusIcon className="size-5" aria-hidden />
          </button>
          <span aria-live="polite" aria-label={`${quantity} entradas`} className="w-10 text-center text-2xl font-bold tabular-nums">
            {quantity}
          </span>
          <button type="button" aria-label={`Agregar una entrada de ${tier.name}`} disabled={full} onClick={() => onChange(quantity + 1)} className={`${stepButton} bg-strong text-white`}>
            <PlusIcon className="size-5" aria-hidden />
          </button>
        </span>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
        <span className="text-muted-foreground">{full ? `Llegaste al máximo de ${MAX_TICKETS_PER_ZONE} entradas.` : `Máximo ${MAX_TICKETS_PER_ZONE} entradas por zona.`}</span>
        <span className="whitespace-nowrap">
          Subtotal <strong className="font-semibold tabular-nums">{formatPrice(quantity * tier.price, currency)}</strong>
        </span>
      </div>
    </div>
  );
}
