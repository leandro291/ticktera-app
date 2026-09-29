"use client";

import { useMemo, useState } from "react";
import { ArrowUpDownIcon, SlidersHorizontalIcon, XIcon } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { MONTH_OPTIONS, PRICE_RANGES } from "../data/events";
import { filterEvents } from "../services/event-service";
import { EVENT_CATEGORIES, type EventSort, type EventSummary } from "../types/event";
import { EventCard } from "./event-card";
import { EventEmptyState } from "./event-empty-state";
import { EventFilters, type SearchFilterState } from "./event-filters";
import { EventSearchBar, type EventSearchValues } from "./event-search-bar";

interface EventSearchProps {
  events: EventSummary[];
  initialQuery?: string;
  initialFilters?: Partial<SearchFilterState>;
}

const EMPTY_FILTERS: SearchFilterState = { categories: [], cities: [], month: "any", price: "any" };

const countBy = (events: EventSummary[], key: "category" | "city") =>
  events.reduce<Record<string, number>>((acc, e) => ({ ...acc, [e[key]]: (acc[e[key]] ?? 0) + 1 }), {});

const pluralEvents = (n: number) => (n === 1 ? "1 evento" : `${n} eventos`);

export function EventSearch({ events, initialQuery = "", initialFilters }: EventSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilterState>({ ...EMPTY_FILTERS, ...initialFilters });
  const [sort, setSort] = useState<EventSort>("date");

  const results = useMemo(() => filterEvents(events, { query, sort, ...filters }), [events, query, sort, filters]);
  const counts = useMemo(() => ({ category: countBy(events, "category"), city: countBy(events, "city") }), [events]);

  const update = (patch: Partial<SearchFilterState>) => setFilters((f) => ({ ...f, ...patch }));
  const clearAll = () => {
    setFilters(EMPTY_FILTERS);
    setQuery("");
  };
  const onSearch = (values: EventSearchValues) => {
    setQuery(values.query);
    update({ month: values.month, price: values.price });
  };

  const monthLabel = MONTH_OPTIONS.find((m) => m.key === filters.month)?.label;
  const priceLabel = PRICE_RANGES.find((p) => p.key === filters.price)?.label;
  const chips = [
    ...(query ? [{ label: `“${query}”`, remove: () => setQuery("") }] : []),
    ...filters.categories.map((c) => ({ label: c, remove: () => update({ categories: filters.categories.filter((v) => v !== c) }) })),
    ...filters.cities.map((c) => ({ label: c, remove: () => update({ cities: filters.cities.filter((v) => v !== c) }) })),
    ...(filters.month !== "any" ? [{ label: monthLabel ?? "", remove: () => update({ month: "any" }) }] : []),
    ...(filters.price !== "any" ? [{ label: priceLabel ?? "", remove: () => update({ price: "any" }) }] : []),
  ];
  const panelCount = filters.cities.length + (filters.month !== "any" ? 1 : 0) + (filters.price !== "any" ? 1 : 0);
  const countLabel = pluralEvents(results.length);

  return (
    <>
      <section className="border-b border-divider bg-background">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3.5 px-4 pt-5 pb-[18px] lg:gap-5 lg:px-20 lg:pt-9 lg:pb-8">
          <h1 className="text-[28px] leading-[1.15] font-bold tracking-[-0.025em] lg:text-4xl lg:leading-[1.1]">Explora eventos</h1>
          <EventSearchBar
            key={`${query}|${filters.month}|${filters.price}`}
            defaultValues={{ query, month: filters.month, price: filters.price }}
            onSearch={onSearch}
          />

          {/* Mobile controls */}
          <div className="flex gap-2 lg:hidden">
            <Sheet>
              <SheetTrigger className="flex h-11 items-center gap-2 rounded-xl border-[1.5px] border-input bg-background px-4 text-sm font-semibold">
                <SlidersHorizontalIcon className="size-[18px]" aria-hidden />
                Filtros
                {panelCount > 0 && (
                  <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                    {panelCount}
                  </span>
                )}
              </SheetTrigger>
              <SheetContent side="bottom" showCloseButton={false} className="gap-0 bg-background p-0 data-[side=bottom]:h-dvh">
                <SheetHeader className="h-16 shrink-0 flex-row items-center justify-between border-b border-divider pr-2 pl-4">
                  <SheetTitle className="text-lg font-semibold">Filtros</SheetTitle>
                  <SheetClose aria-label="Cerrar filtros" className="flex size-11 items-center justify-center rounded-xl hover:bg-muted">
                    <XIcon className="size-[22px]" aria-hidden />
                  </SheetClose>
                </SheetHeader>
                <div className="grow overflow-y-auto px-4 py-1">
                  <EventFilters filters={filters} onChange={update} counts={counts} showCategories={false} size="lg" />
                </div>
                <SheetFooter className="flex-row gap-2.5 border-t border-divider px-4 pt-3 pb-5">
                  <button
                    type="button"
                    onClick={() => update({ cities: [], month: "any", price: "any" })}
                    className="h-[52px] rounded-[14px] border-[1.5px] border-input px-[18px] text-[15px] font-semibold"
                  >
                    Limpiar
                  </button>
                  <SheetClose className="h-[52px] grow rounded-[14px] bg-strong text-[15px] font-semibold text-white">
                    Ver {countLabel}
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
            <button
              type="button"
              onClick={() => setSort((s) => (s === "date" ? "price" : "date"))}
              aria-label={`Cambiar orden. Ahora: ${sort === "price" ? "Precio" : "Fecha"}`}
              className="flex h-11 items-center gap-1.5 rounded-xl border-[1.5px] border-input bg-background px-4 text-sm font-medium"
            >
              <span className="text-muted-foreground">Orden:</span>
              <strong className="font-semibold">{sort === "price" ? "Precio" : "Fecha"}</strong>
              <ArrowUpDownIcon className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      </section>

      {/* Mobile quick categories */}
      <nav aria-label="Categorías" className="scrollbar-none flex gap-2 overflow-x-auto px-4 pt-4 pb-1 lg:hidden">
        {EVENT_CATEGORIES.map((category) => {
          const on = filters.categories.includes(category);
          return (
            <button
              key={category}
              type="button"
              aria-pressed={on}
              onClick={() => update({ categories: on ? filters.categories.filter((c) => c !== category) : [...filters.categories, category] })}
              className={cn(
                "h-11 shrink-0 rounded-full border-[1.5px] px-4 text-sm whitespace-nowrap",
                on ? "border-strong bg-strong font-semibold text-white" : "border-input bg-background font-medium",
              )}
            >
              {category}
            </button>
          );
        })}
      </nav>

      <div className="mx-auto grid w-full max-w-[1440px] items-start gap-10 px-4 pt-3 pb-10 lg:grid-cols-[288px_minmax(0,1fr)] lg:px-20 lg:pt-8 lg:pb-20">
        <aside aria-label="Filtros" className="hidden flex-col rounded-[22px] border border-border bg-card px-6 pt-2 pb-6 lg:flex">
          <div className="flex h-[60px] items-center justify-between border-b border-divider">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <SlidersHorizontalIcon className="size-[18px]" aria-hidden />
              Filtros
            </h2>
            {chips.length > 0 && (
              <button type="button" onClick={clearAll} className="h-11 px-1 text-sm font-semibold text-primary">
                Limpiar
              </button>
            )}
          </div>
          <EventFilters filters={filters} onChange={update} counts={counts} />
        </aside>

        <section aria-label="Resultados" className="flex flex-col gap-3 lg:gap-5">
          <div className="flex min-h-11 items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-2">
              <p aria-live="polite" className="mr-2 text-[15px] font-semibold lg:text-base">
                {countLabel}
              </p>
              {chips.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={chip.remove}
                  aria-label={`Quitar filtro ${chip.label}`}
                  className="hidden h-9 items-center gap-1.5 rounded-full border border-indigo-200 bg-accent pr-2.5 pl-3.5 text-[13px] font-medium text-accent-foreground lg:flex"
                >
                  {chip.label}
                  <XIcon className="size-3.5" aria-hidden />
                </button>
              ))}
            </div>
            <div className="hidden shrink-0 items-center gap-2.5 lg:flex">
              <span className="text-sm text-muted-foreground">Ordenar por</span>
              <div className="flex gap-1 rounded-[14px] border border-border bg-background p-1">
                {(
                  [
                    ["date", "Fecha"],
                    ["price", "Precio más bajo"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={sort === key}
                    onClick={() => setSort(key)}
                    className={cn(
                      "h-10 rounded-[10px] px-4 text-sm font-semibold",
                      sort === key ? "bg-strong text-white" : "text-foreground hover:bg-muted",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 content-start gap-3 lg:grid-cols-2 lg:gap-6 xl:grid-cols-3">
            {results.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
            {results.length === 0 && (
              <EventEmptyState
                title="No encontramos eventos con esos filtros"
                description="Prueba quitando algún filtro o buscando otra ciudad."
                actionLabel="Limpiar filtros"
                onAction={clearAll}
              />
            )}
          </div>
        </section>
      </div>
    </>
  );
}
