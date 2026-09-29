"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MONTH_OPTIONS, PRICE_RANGES } from "../data/events";
import type { PriceRangeKey } from "../types/event";

export interface EventSearchValues {
  query: string;
  month: string;
  price: PriceRangeKey;
}

interface EventSearchBarProps {
  defaultValues?: Partial<EventSearchValues>;
  /** Without a handler the bar navigates to `/events` with the values as query params. */
  onSearch?: (values: EventSearchValues) => void;
}

const monthItems = MONTH_OPTIONS.map((m) => ({ value: m.key, label: m.key === "any" ? "Cualquier día" : m.label }));
const priceItems = PRICE_RANGES.map((p) => ({ value: p.key, label: p.label }));

export function toSearchParams({ query, month, price }: EventSearchValues): string {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (month !== "any") params.set("month", month);
  if (price !== "any") params.set("price", price);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

const fieldTrigger =
  "h-full data-[size=default]:h-full w-[150px] flex-col items-start justify-center gap-0.5 rounded-2xl border-0 px-[18px] py-1.5 text-left hover:bg-muted focus-visible:ring-0 [&>svg]:hidden";

export function EventSearchBar({ defaultValues, onSearch }: EventSearchBarProps) {
  const router = useRouter();
  const [values, setValues] = useState<EventSearchValues>({
    query: defaultValues?.query ?? "",
    month: defaultValues?.month ?? "any",
    price: defaultValues?.price ?? "any",
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (onSearch) onSearch(values);
    else router.push(`/events${toSearchParams(values)}`);
  };

  return (
    <form
      role="search"
      onSubmit={submit}
      className="flex h-14 items-center gap-2.5 rounded-[18px] border border-border bg-background py-1.5 pr-1.5 pl-4 shadow-[0_10px_24px_-16px_rgba(24,24,27,.25)] lg:h-[76px] lg:items-stretch lg:gap-0 lg:rounded-[22px] lg:p-2 lg:shadow-[0_12px_32px_-16px_rgba(24,24,27,.22)]"
    >
      <label className="flex grow cursor-text items-center gap-2.5 text-muted-foreground lg:flex-col lg:items-start lg:justify-center lg:gap-0.5 lg:rounded-2xl lg:px-[18px] lg:py-1.5">
        <SearchIcon className="size-5 shrink-0 lg:hidden" aria-hidden />
        <span className="sr-only text-xs font-semibold text-foreground lg:not-sr-only">Qué quieres ver</span>
        <input
          type="search"
          value={values.query}
          onChange={(e) => setValues((v) => ({ ...v, query: e.target.value }))}
          placeholder="Artista, evento o ciudad"
          className="w-full bg-transparent p-0 text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
        />
      </label>

      <span className="my-3 hidden w-px bg-border lg:block" aria-hidden />
      <div className="hidden lg:block">
        <Select items={monthItems} value={values.month} onValueChange={(month) => month && setValues((v) => ({ ...v, month }))}>
          <SelectTrigger aria-label="Fecha" className={fieldTrigger}>
            <span className="text-xs font-semibold text-foreground">Fecha</span>
            <SelectValue className="text-[15px] text-muted-foreground" />
          </SelectTrigger>
          <SelectContent>
            {monthItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <span className="my-3 hidden w-px bg-border lg:block" aria-hidden />
      <div className="hidden lg:block">
        <Select items={priceItems} value={values.price} onValueChange={(price) => price && setValues((v) => ({ ...v, price }))}>
          <SelectTrigger aria-label="Precio" className={fieldTrigger}>
            <span className="text-xs font-semibold text-foreground">Precio</span>
            <SelectValue className="text-[15px] text-muted-foreground" />
          </SelectTrigger>
          <SelectContent>
            {priceItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <button
        type="submit"
        className="flex h-11 shrink-0 items-center gap-2 rounded-[13px] bg-cta px-4 text-sm font-semibold text-cta-foreground hover:bg-cta-hover lg:h-auto lg:rounded-2xl lg:px-6 lg:text-[15px]"
      >
        <SearchIcon className="hidden size-[18px] lg:block" aria-hidden />
        Buscar
      </button>
    </form>
  );
}
