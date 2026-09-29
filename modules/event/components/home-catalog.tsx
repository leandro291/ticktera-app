"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  ClapperboardIcon,
  DramaIcon,
  LaughIcon,
  MusicIcon,
  PaletteIcon,
  PartyPopperIcon,
  TrophyIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EVENT_CATEGORIES, type EventCategory, type EventSummary } from "../types/event";
import { EventCard } from "./event-card";
import { EventEmptyState } from "./event-empty-state";

const CATEGORY_TILES: Record<EventCategory, { icon: LucideIcon; bg: string; fg: string }> = {
  Conciertos: { icon: MusicIcon, bg: "bg-[#eef0ff]", fg: "text-[#4338ca]" },
  Deportes: { icon: TrophyIcon, bg: "bg-[#e7f6ec]", fg: "text-[#15803d]" },
  Teatro: { icon: DramaIcon, bg: "bg-[#fcebef]", fg: "text-[#be123c]" },
  Festivales: { icon: PartyPopperIcon, bg: "bg-[#fff1e6]", fg: "text-[#c2410c]" },
  Familiar: { icon: UsersIcon, bg: "bg-[#e4f5f7]", fg: "text-[#0e7490]" },
  Cine: { icon: ClapperboardIcon, bg: "bg-[#f1ecfb]", fg: "text-[#6d28d9]" },
  Comedia: { icon: LaughIcon, bg: "bg-[#fdf5d8]", fg: "text-[#a16207]" },
  "Arte y Exposiciones": { icon: PaletteIcon, bg: "bg-[#fbeaf6]", fg: "text-[#a21caf]" },
};

type Selection = EventCategory | "all";

const DESKTOP_LIMIT = 8;
const MOBILE_LIMIT = 5;

/** "Explora por categoría" tiles + "Próximos eventos" grid; both drive the same category selection. */
export function HomeCatalog({ events }: { events: EventSummary[] }) {
  const [selected, setSelected] = useState<Selection>("all");

  const list = selected === "all" ? events.slice(0, DESKTOP_LIMIT) : events.filter((e) => e.category === selected);
  const chips: { key: Selection; label: string }[] = [{ key: "all", label: "Todos" }, ...EVENT_CATEGORIES.map((c) => ({ key: c, label: c }))];

  const pickTile = (category: EventCategory) => {
    setSelected((current) => (current === category ? "all" : category));
    document.getElementById("eventos")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <section id="categorias" className="mx-auto flex w-full max-w-[1440px] scroll-mt-20 flex-col gap-[18px] pt-10 pb-8 lg:gap-8 lg:px-20 lg:pt-16 lg:pb-20">
        <div className="flex flex-col gap-1 px-4 lg:gap-2 lg:px-0">
          <h2 className="text-2xl leading-tight font-bold tracking-[-0.02em] lg:text-[32px]">Explora por categoría</h2>
          <p className="text-sm text-muted-foreground lg:text-base">Elige lo que te gusta y te mostramos lo que viene.</p>
        </div>
        <div className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 lg:grid lg:grid-cols-8 lg:gap-4 lg:overflow-visible lg:px-0">
          {EVENT_CATEGORIES.map((category) => {
            const tile = CATEGORY_TILES[category];
            const Icon = tile.icon;
            return (
              <button
                key={category}
                type="button"
                aria-pressed={selected === category}
                onClick={() => pickTile(category)}
                className={cn(
                  "flex h-[132px] w-[136px] shrink-0 snap-start flex-col items-start justify-between rounded-[22px] border-2 p-4 text-left transition-[transform,box-shadow] duration-200 lg:h-[168px] lg:w-auto lg:rounded-3xl lg:p-5 lg:hover:-translate-y-[3px] lg:hover:shadow-[0_14px_28px_-18px_rgba(24,24,27,.4)] motion-reduce:transition-none motion-reduce:hover:translate-y-0",
                  tile.bg,
                  selected === category ? "border-primary" : "border-transparent",
                )}
              >
                <span className={cn("flex size-12 items-center justify-center rounded-2xl bg-white lg:size-14 lg:rounded-[18px]", tile.fg)}>
                  <Icon className="size-6 lg:size-7" aria-hidden />
                </span>
                <span className="text-sm leading-tight font-semibold text-foreground lg:text-base">{category}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section id="eventos" className="scroll-mt-16 bg-canvas lg:scroll-mt-20">
        <div className="mx-auto flex max-w-[1440px] flex-col pt-10 pb-12 lg:px-20 lg:pt-20 lg:pb-[88px]">
          <div className="flex items-end justify-between gap-8 px-4 lg:px-0">
            <div className="flex flex-col gap-1 lg:gap-2">
              <h2 className="text-2xl leading-tight font-bold tracking-[-0.02em] lg:text-[32px]">Próximos eventos</h2>
              <p className="text-sm text-muted-foreground lg:text-base">
                Ordenados por fecha. Asegura tu lugar<span className="hidden lg:inline"> antes de que se agoten</span>.
              </p>
            </div>
            <Link href="/events" className="hidden h-11 items-center gap-1.5 text-[15px] font-semibold text-primary lg:flex">
              Ver calendario completo
              <ArrowRightIcon className="size-[18px]" aria-hidden />
            </Link>
          </div>

          <div role="group" aria-label="Filtrar por categoría" className="scrollbar-none mt-4 flex gap-2 overflow-x-auto px-4 lg:mt-7 lg:flex-wrap lg:gap-2.5 lg:px-0">
            {chips.map((chip) => {
              const on = selected === chip.key;
              return (
                <button
                  key={chip.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSelected(chip.key)}
                  className={cn(
                    "h-11 shrink-0 rounded-full border-[1.5px] px-4 text-sm whitespace-nowrap lg:px-[18px]",
                    on ? "border-strong bg-strong font-semibold text-white" : "border-input bg-background font-medium hover:border-foreground",
                  )}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          <div className="mt-5 grid grid-cols-1 content-start gap-3 px-4 lg:mt-8 lg:min-h-[860px] lg:grid-cols-3 lg:gap-6 lg:px-0 xl:grid-cols-4">
            {list.map((event, i) => (
              <div key={event.id} className={cn(selected === "all" && i >= MOBILE_LIMIT && "hidden lg:block")}>
                <EventCard event={event} />
              </div>
            ))}
            {list.length === 0 && (
              <EventEmptyState
                title={`Todavía no hay eventos de ${selected}`}
                description="Estamos sumando nuevas fechas. Mientras tanto, mira todo lo que viene."
                actionLabel="Ver todos los eventos"
                onAction={() => setSelected("all")}
              />
            )}
          </div>

          <Link
            href="/events"
            className="mx-4 mt-5 flex h-[52px] items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-strong bg-background text-[15px] font-semibold text-foreground hover:bg-muted hover:text-foreground lg:mx-auto lg:mt-10 lg:px-7"
          >
            Ver todos los eventos
            <ArrowRightIcon className="size-[18px]" aria-hidden />
          </Link>
        </div>
      </section>
    </>
  );
}
