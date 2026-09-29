import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "../lib/format";
import type { EventSummary } from "../types/event";
import { EventDateBadge } from "./event-date-badge";

export function RelatedEventCard({ event }: { event: EventSummary }) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="flex w-[250px] shrink-0 snap-start flex-col overflow-hidden rounded-[20px] border border-border bg-card text-foreground transition-[transform,box-shadow] duration-250 hover:text-foreground lg:w-auto lg:rounded-[22px] lg:hover:-translate-y-1 lg:hover:shadow-[0_20px_40px_-20px_rgba(24,24,27,.35)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <span className="relative block h-[140px] bg-border lg:h-[170px]">
        <Image src={event.image} alt={event.imageAlt} fill sizes="(min-width: 1024px) 320px, 250px" className="object-cover" />
        <EventDateBadge date={event.date} className="absolute top-2.5 left-2.5 lg:top-3 lg:left-3" />
      </span>
      <span className="flex flex-col gap-1.5 px-4 pt-3.5 pb-4 lg:gap-2 lg:px-5 lg:pt-[18px] lg:pb-5">
        <span className="hidden text-xs font-semibold tracking-[0.06em] text-primary uppercase lg:block">{event.category}</span>
        <span className="line-clamp-2 min-h-10 text-[15px] leading-[1.3] font-semibold lg:min-h-[46px] lg:text-[17px] lg:leading-[1.35]">
          {event.title}
        </span>
        <span className="truncate text-xs text-muted-foreground lg:text-sm">
          {event.venue} · {event.city}
        </span>
        <span className="flex items-baseline gap-1.5">
          <span className="text-xs text-muted-foreground">Desde</span>
          <span className="text-base font-bold text-price lg:text-lg">{formatPrice(event.priceFrom, event.currency)}</span>
        </span>
      </span>
    </Link>
  );
}
