import Image from "next/image";
import Link from "next/link";
import { CalendarIcon, MapPinIcon } from "lucide-react";
import { formatDateShort, formatPrice } from "../lib/format";
import type { EventSummary } from "../types/event";
import { EventDateBadge } from "./event-date-badge";
import { EventStatusBadge } from "./event-status-badge";

const notch = "absolute size-5 rounded-full border border-border bg-canvas";

/** Ticket-shaped card: horizontal row on mobile, vertical card from `lg`. */
export function EventCard({ event }: { event: EventSummary }) {
  const soldOut = event.status === "sold-out";
  const price = formatPrice(event.priceFrom, event.currency);

  return (
    <Link
      href={`/events/${event.id}`}
      className="relative flex min-h-[132px] overflow-hidden rounded-[20px] border border-border bg-card text-foreground transition-[transform,box-shadow] duration-250 hover:text-foreground lg:h-full lg:min-h-0 lg:flex-col lg:rounded-[22px] lg:hover:-translate-y-1 lg:hover:shadow-[0_20px_40px_-20px_rgba(24,24,27,.35)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <span className="relative block w-[108px] shrink-0 bg-border lg:h-[176px] lg:w-full">
        <Image src={event.image} alt={event.imageAlt} fill sizes="(min-width: 1024px) 360px, 108px" className="object-cover" />
        <EventDateBadge date={event.date} className="absolute top-2 left-2 lg:top-3 lg:left-3" />
        <EventStatusBadge status={event.status} className="absolute top-3 right-3 hidden h-7 px-3 lg:inline-flex" />
      </span>

      <span className="relative flex min-w-0 grow flex-col gap-1 border-l-[1.5px] border-dashed border-input px-3.5 py-3 lg:gap-2 lg:border-l-0 lg:px-5 lg:pt-[18px] lg:pb-0">
        <span className={`${notch} -top-2.5 -left-2.5 lg:hidden`} />
        <span className={`${notch} -bottom-2.5 -left-2.5 lg:hidden`} />
        <span className="flex items-center justify-between gap-1.5">
          <span className="text-[11px] font-semibold tracking-[0.06em] text-primary uppercase lg:text-xs">{event.category}</span>
          <EventStatusBadge status={event.status} className="h-[22px] text-[11px] lg:hidden" />
        </span>
        <span className="line-clamp-2 text-[15px] leading-[1.3] font-semibold lg:min-h-[46px] lg:text-[17px] lg:leading-[1.35]">
          {event.title}
        </span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground lg:text-sm">
          <MapPinIcon className="hidden size-4 shrink-0 lg:block" aria-hidden />
          <span className="truncate">
            {event.venue} · {event.city}
          </span>
        </span>
        <span className="hidden items-center gap-2 text-sm text-muted-foreground lg:flex">
          <CalendarIcon className="size-4 shrink-0" aria-hidden />
          {formatDateShort(event.date)}
        </span>
        <span className="mt-auto flex items-baseline gap-1.5 lg:hidden">
          <span className="text-xs text-muted-foreground">Desde</span>
          <span className="text-base font-bold text-price">{price}</span>
        </span>
      </span>

      <span className="relative mt-[18px] hidden border-t-[1.5px] border-dashed border-input lg:block">
        <span className={`${notch} -top-2.5 -left-2.5`} />
        <span className={`${notch} -top-2.5 -right-2.5`} />
      </span>
      <span className="hidden items-center justify-between gap-3 px-5 pt-4 pb-5 lg:flex">
        <span className="flex flex-col">
          <span className="text-xs text-muted-foreground">Desde</span>
          <span className="text-[19px] font-bold tracking-tight text-price">{price}</span>
        </span>
        {soldOut ? (
          <span className="flex h-11 items-center rounded-xl bg-muted px-4 text-sm font-semibold text-muted-foreground">Agotado</span>
        ) : (
          <span className="flex h-11 items-center rounded-xl border-[1.5px] border-strong px-4 text-sm font-semibold">Ver entradas</span>
        )}
      </span>
    </Link>
  );
}
