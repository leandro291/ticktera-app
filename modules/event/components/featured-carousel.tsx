"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon, MapPinIcon, PauseIcon, PlayIcon } from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { formatDateLong, formatDateShort, formatPrice } from "../lib/format";
import type { EventSummary } from "../types/event";

const SLIDE_MS = 6000;
const pad = (n: number) => String(n).padStart(2, "0");

export function FeaturedCarousel({ events }: { events: EventSummary[] }) {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [index, setIndex] = useState(0);
  const [userPlaying, setUserPlaying] = useState<boolean | null>(null);
  const playing = userPlaying ?? !reducedMotion;
  const total = events.length;
  const current = events[index];

  const go = (next: number) => setIndex((next + total) % total);

  // Re-armed on every slide change, so manual navigation restarts the countdown.
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % total), SLIDE_MS);
    return () => clearTimeout(timer);
  }, [playing, index, total]);

  const controls = (
    <div className="absolute right-3 bottom-3 flex gap-0.5 rounded-full bg-white p-1 shadow-[0_8px_24px_-10px_rgba(0,0,0,.45)] lg:right-6 lg:bottom-6 lg:gap-1 lg:p-1.5">
      <button type="button" aria-label="Evento anterior" onClick={() => go(index - 1)} className="flex size-11 items-center justify-center rounded-full text-foreground hover:bg-muted">
        <ChevronLeftIcon className="size-5" aria-hidden />
      </button>
      <button
        type="button"
        aria-label={playing ? "Pausar carrusel" : "Reproducir carrusel"}
        onClick={() => setUserPlaying(!playing)}
        className="flex size-11 items-center justify-center rounded-full bg-muted text-foreground hover:bg-border"
      >
        {playing ? <PauseIcon className="size-[18px]" aria-hidden /> : <PlayIcon className="size-[18px]" aria-hidden />}
      </button>
      <button type="button" aria-label="Evento siguiente" onClick={() => go(index + 1)} className="flex size-11 items-center justify-center rounded-full text-foreground hover:bg-muted">
        <ChevronRightIcon className="size-5" aria-hidden />
      </button>
    </div>
  );

  return (
    <section aria-roledescription="carrusel" aria-label="Eventos destacados" className="mx-auto flex max-w-[1440px] flex-col lg:gap-[22px] lg:px-20 lg:pb-6">
      <div className="mx-4 flex flex-col overflow-hidden rounded-[28px] bg-stage lg:mx-0 lg:grid lg:h-[520px] lg:grid-cols-[520px_minmax(0,1fr)] lg:rounded-[32px]">
        <div className="relative h-[230px] overflow-hidden bg-[#27245a] lg:order-2 lg:h-auto">
          {events.map((event, i) => (
            <Image
              key={event.id}
              src={event.image}
              alt={event.imageAlt}
              fill
              priority={i === 0}
              sizes="(min-width: 1024px) 800px, 100vw"
              aria-hidden={i !== index}
              className={cn("object-cover transition-opacity duration-700 motion-reduce:transition-none", i === index ? "opacity-100" : "opacity-0")}
            />
          ))}
          {current.status === "last-tickets" && (
            <span className="absolute top-3.5 left-3.5 flex h-[30px] items-center rounded-full bg-warning px-3 text-xs font-semibold text-warning-foreground lg:top-6 lg:left-6 lg:h-[34px] lg:px-3.5 lg:text-[13px]">
              Últimas entradas
            </span>
          )}
          {controls}
        </div>

        <div aria-live={playing ? "off" : "polite"} className="flex flex-col p-[22px] pb-6 text-white lg:order-1 lg:p-12">
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5 lg:gap-2">
              <span className="flex h-7 items-center rounded-full bg-cta px-3 text-xs font-semibold text-cta-foreground lg:h-8 lg:px-3.5 lg:text-[13px]">Destacado</span>
              <span className="flex h-7 items-center rounded-full border border-white/30 px-3 text-xs font-medium lg:h-8 lg:px-3.5 lg:text-[13px]">
                {current.category}
              </span>
            </div>
            <span className="text-[13px] font-medium text-indigo-200 tabular-nums lg:text-sm">
              {pad(index + 1)} / {pad(total)}
            </span>
          </div>
          <h2 className="mt-[18px] text-[26px] leading-[1.15] font-bold tracking-[-0.02em] text-balance lg:mt-7 lg:text-[44px] lg:leading-[1.1] lg:tracking-[-0.025em]">
            {current.title}
          </h2>
          <div className="mt-3.5 flex flex-col gap-2 text-sm text-indigo-100 lg:mt-5 lg:gap-2.5 lg:text-base">
            <span className="flex items-center gap-2 lg:gap-2.5">
              <CalendarIcon className="size-[18px] shrink-0" aria-hidden />
              {formatDateLong(current.date)}
            </span>
            <span className="flex items-center gap-2 lg:gap-2.5">
              <MapPinIcon className="size-[18px] shrink-0" aria-hidden />
              {current.venue}, {current.city}
            </span>
          </div>
          <div className="mt-5 flex items-center justify-between gap-3 lg:mt-auto lg:flex-col lg:items-stretch lg:gap-3.5">
            <div className="flex flex-col lg:flex-row lg:items-baseline lg:gap-2">
              <span className="text-xs text-indigo-200 lg:text-sm">Desde</span>
              <span className="text-2xl font-bold tracking-[-0.02em] lg:text-[30px]">{formatPrice(current.priceFrom, current.currency)}</span>
            </div>
            <div className="flex gap-2.5">
              <Link
                href={`/events/${current.id}/tickets`}
                className="flex h-[52px] grow items-center justify-center gap-2 rounded-[15px] bg-cta px-5 text-[15px] font-semibold text-cta-foreground hover:bg-cta-hover hover:text-cta-foreground lg:h-[54px] lg:rounded-2xl lg:text-base"
              >
                Comprar entradas
                <ArrowRightIcon className="size-[18px]" aria-hidden />
              </Link>
              <Link
                href={`/events/${current.id}`}
                className="hidden h-[54px] items-center rounded-2xl border-[1.5px] border-white/40 px-[22px] text-base font-medium text-white hover:bg-white/10 hover:text-white lg:flex"
              >
                Ver detalles
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pt-4 pb-1 lg:grid lg:grid-cols-5 lg:gap-4 lg:overflow-visible lg:p-0">
        {events.map((event, i) => {
          const active = i === index;
          return (
            <button
              key={event.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`Ver ${event.title}`}
              aria-current={active}
              className="flex w-[220px] shrink-0 snap-start flex-col gap-3 text-left lg:w-auto lg:min-w-0 lg:gap-3.5"
            >
              <span className="block h-[3px] w-full overflow-hidden rounded-full bg-border">
                {active && (
                  <span
                    key={`${index}-${playing}`}
                    className={cn("block h-full bg-primary", playing ? "animate-[tk-progress_6s_linear_forwards]" : "w-full")}
                  />
                )}
              </span>
              <span className="flex items-center gap-2.5 lg:gap-3">
                <span className={cn("relative size-12 shrink-0 overflow-hidden rounded-xl lg:size-14 lg:rounded-[14px]", !active && "opacity-70")}>
                  <Image src={event.image} alt="" fill sizes="56px" className="object-cover" />
                </span>
                <span className="flex min-w-0 flex-col gap-px lg:gap-0.5">
                  <span className={cn("truncate text-[13px] font-semibold lg:text-sm", active ? "text-foreground" : "text-muted-foreground")}>
                    {event.title}
                  </span>
                  <span className="text-xs whitespace-nowrap text-muted-foreground lg:text-[13px]">
                    {formatDateShort(event.date)} · {event.city}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
