"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { getTotalCapacity } from "../lib/event-draft";
import type { TierDraft } from "../types/organizer-event";
import { field, section } from "./event-form-styles";

const number = new Intl.NumberFormat("es-PE");

interface EventFormTiersProps {
  tiers: TierDraft[];
  onChange: (id: string, patch: Partial<TierDraft>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}

/** "Tipos de entrada": table on desktop, one card per tier on mobile. At least one tier is kept. */
export function EventFormTiers({ tiers, onChange, onAdd, onRemove }: EventFormTiersProps) {
  const single = tiers.length === 1;

  return (
    <section className={section} aria-labelledby="tiers-title">
      <div className="flex flex-col gap-1">
        <h2 id="tiers-title" className="text-[17px] font-semibold lg:text-lg">
          Tipos de entrada
        </h2>
        <p className="text-[13px] text-muted-foreground lg:text-sm">Cada tipo tiene su precio y su cantidad disponible.</p>
      </div>

      <div aria-hidden className="hidden grid-cols-[minmax(0,1fr)_150px_150px_44px] gap-3 text-[13px] font-medium text-muted-foreground lg:grid">
        <span>Nombre</span>
        <span>Precio (S/)</span>
        <span>Cantidad</span>
        <span />
      </div>

      <ul className="flex flex-col gap-3">
        {tiers.map((tier, i) => {
          const n = i + 1;
          return (
            <li
              key={tier.id}
              className="relative flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3.5 lg:grid lg:grid-cols-[minmax(0,1fr)_150px_150px_44px] lg:items-center lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0"
            >
              <span className="text-sm leading-6 font-semibold lg:hidden">Tipo {n}</span>
              <label className="flex flex-col gap-1.5 text-[13px] font-medium lg:contents">
                <span className="lg:sr-only">Nombre</span>
                <Input
                  required
                  value={tier.name}
                  onChange={(e) => onChange(tier.id, { name: e.target.value })}
                  aria-label={`Nombre del tipo de entrada ${n}`}
                  placeholder="Ej. General"
                  className={field}
                />
              </label>
              <div className="grid grid-cols-2 gap-3 lg:contents">
                <label className="flex flex-col gap-1.5 text-[13px] font-medium lg:contents">
                  <span className="lg:sr-only">Precio (S/)</span>
                  <Input
                    required
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    value={tier.price}
                    onChange={(e) => onChange(tier.id, { price: e.target.value })}
                    aria-label={`Precio del tipo de entrada ${n}`}
                    placeholder="0"
                    className={field}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-[13px] font-medium lg:contents">
                  <span className="lg:sr-only">Cantidad</span>
                  <Input
                    required
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={tier.quantity}
                    onChange={(e) => onChange(tier.id, { quantity: e.target.value })}
                    aria-label={`Cantidad del tipo de entrada ${n}`}
                    placeholder="0"
                    className={field}
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={single}
                onClick={() => onRemove(tier.id)}
                aria-label={`Quitar tipo de entrada ${n}`}
                className="absolute top-1 right-1 flex size-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40 lg:static"
              >
                <Trash2Icon className="size-[18px]" aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={onAdd}
        className="flex h-12 items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-indigo-300 text-sm font-semibold text-indigo-700 hover:bg-accent lg:h-11 lg:w-fit lg:rounded-xl lg:px-4"
      >
        <PlusIcon className="size-[18px]" aria-hidden />
        Agregar tipo de entrada
      </button>

      <p className="flex justify-between border-t border-divider pt-3 text-sm text-muted-foreground lg:pt-3.5">
        <span>Capacidad total</span>
        <strong className="font-semibold text-foreground tabular-nums" aria-live="polite">
          {number.format(getTotalCapacity(tiers))} entradas
        </strong>
      </p>
    </section>
  );
}
