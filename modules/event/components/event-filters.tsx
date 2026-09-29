"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { CITIES, MONTH_OPTIONS, PRICE_RANGES } from "../data/events";
import { EVENT_CATEGORIES, type EventCategory, type PriceRangeKey } from "../types/event";

export interface SearchFilterState {
  categories: EventCategory[];
  cities: string[];
  month: string;
  price: PriceRangeKey;
}

interface EventFiltersProps {
  filters: SearchFilterState;
  onChange: (patch: Partial<SearchFilterState>) => void;
  counts: { category: Record<string, number>; city: Record<string, number> };
  showCategories?: boolean;
  /** Larger touch targets for the mobile panel. */
  size?: "default" | "lg";
}

const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

export function EventFilters({ filters, onChange, counts, showCategories = true, size = "default" }: EventFiltersProps) {
  const row = cn("flex cursor-pointer items-center gap-3", size === "lg" ? "h-11 text-[15px]" : "h-[38px] text-sm");
  const control = size === "lg" ? "size-5" : "size-[18px]";
  const fieldset = "flex flex-col border-b border-divider py-4 last:border-b-0 lg:py-[18px]";
  const legend = cn("pb-2 font-semibold lg:pb-2.5", size === "lg" ? "text-[15px]" : "text-sm");

  const checkboxGroup = (legendText: string, options: readonly string[], selected: string[], key: "categories" | "cities", countMap: Record<string, number>) => (
    <fieldset className={fieldset}>
      <legend className={legend}>{legendText}</legend>
      {options.map((option) => (
        <label key={option} className={row}>
          <Checkbox
            className={control}
            checked={selected.includes(option)}
            onCheckedChange={() => onChange({ [key]: toggle(selected, option) })}
          />
          <span className="grow">{option}</span>
          <span className="text-[13px] text-muted-foreground tabular-nums">{countMap[option] ?? 0}</span>
        </label>
      ))}
    </fieldset>
  );

  const radioGroup = (legendText: string, options: { key: string; label: string }[], value: string, onValue: (v: string) => void) => (
    <fieldset className={fieldset}>
      <legend className={legend}>{legendText}</legend>
      <RadioGroup value={value} onValueChange={(v) => onValue(v as string)} className="gap-0">
        {options.map((option) => (
          <label key={option.key} className={row}>
            <RadioGroupItem value={option.key} className={control} />
            <span>{option.label}</span>
          </label>
        ))}
      </RadioGroup>
    </fieldset>
  );

  return (
    <div className="flex flex-col">
      {showCategories &&
        checkboxGroup("Categoría", EVENT_CATEGORIES, filters.categories, "categories", counts.category)}
      {checkboxGroup("Ciudad", CITIES, filters.cities, "cities", counts.city)}
      {radioGroup("Fecha", MONTH_OPTIONS, filters.month, (month) => onChange({ month }))}
      {radioGroup("Precio desde", PRICE_RANGES, filters.price, (price) => onChange({ price: price as PriceRangeKey }))}
    </div>
  );
}
