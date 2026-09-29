import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  ClockIcon,
  DoorOpenIcon,
  MapPinIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  UserCheckIcon,
} from "lucide-react";
import { formatDateLong, formatPrice } from "../lib/format";
import type { EventDetail, EventSummary } from "../types/event";
import { EventActions } from "./event-actions";
import { RelatedEventCard } from "./related-event-card";

interface EventDetailViewProps {
  event: EventDetail;
  related: EventSummary[];
  /** Zone/price list rendered in the purchase card (desktop) and the "Entradas" section (mobile). */
  tiers: React.ReactNode;
}

const ctaClass = "flex items-center justify-center gap-2 bg-cta font-semibold text-cta-foreground hover:bg-cta-hover hover:text-cta-foreground";

export function EventDetailView({ event, related, tiers }: EventDetailViewProps) {
  const ticketsHref = `/events/${event.id}/tickets`;
  const priceFrom = formatPrice(event.priceFrom, event.currency);
  const soldOut = event.status === "sold-out";
  const info = [
    { icon: DoorOpenIcon, label: "Apertura de puertas", value: `${event.doorsTime} h` },
    { icon: ClockIcon, label: "Inicio del show", value: `${event.startTime} h` },
    { icon: UserCheckIcon, label: "Edad mínima", value: event.minAge },
    { icon: QrCodeIcon, label: "Ingreso", value: "Entrada digital con QR" },
  ];
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue}, ${event.address}, ${event.city}`)}`;

  return (
    <>
      {/* Mobile top bar (the site header is desktop-only on this page) */}
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-divider bg-background pr-3 pl-2 lg:hidden">
        <Link href="/events" aria-label="Volver a eventos" className="flex size-11 items-center justify-center rounded-xl text-foreground">
          <ArrowLeftIcon className="size-[22px]" aria-hidden />
        </Link>
        <div className="flex gap-1">
          <EventActions title={event.title} variant="bar" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1440px] lg:px-20">
        <nav aria-label="Ruta" className="hidden pt-6 pb-5 lg:block">
          <ol className="flex items-center gap-2 text-sm text-muted-foreground">
            <li>
              <Link href="/" className="text-muted-foreground hover:text-primary">Inicio</Link>
            </li>
            <li aria-hidden>/</li>
            <li>
              <Link href={`/events?category=${encodeURIComponent(event.category)}`} className="text-muted-foreground hover:text-primary">
                {event.category}
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li aria-current="page" className="font-medium text-foreground">{event.title}</li>
          </ol>
        </nav>

        {/* Hero */}
        <section className="px-4 pt-3 lg:px-0 lg:pt-0">
          <div className="flex flex-col overflow-hidden rounded-[28px] bg-stage lg:grid lg:h-[460px] lg:grid-cols-[540px_minmax(0,1fr)] lg:rounded-[32px]">
            <div className="relative h-[220px] lg:order-2 lg:h-auto">
              <Image src={event.image} alt={event.imageAlt} fill priority sizes="(min-width: 1024px) 800px, 100vw" className="object-cover" />
            </div>
            <div className="flex flex-col gap-3.5 px-[22px] pt-[22px] pb-6 text-white lg:order-1 lg:gap-0 lg:px-12 lg:py-11">
              <span className="flex h-7 w-fit items-center rounded-full border border-white/30 px-3 text-xs font-medium lg:h-8 lg:px-3.5 lg:text-[13px]">
                {event.category}
              </span>
              <h1 className="text-[28px] leading-[1.12] font-bold tracking-[-0.025em] text-balance lg:mt-6 lg:text-[46px] lg:leading-[1.08]">
                {event.title}
              </h1>
              <ul className="flex flex-col gap-2 text-sm text-indigo-100 lg:mt-5 lg:gap-2.5 lg:text-base">
                <li className="flex items-center gap-2 lg:gap-2.5">
                  <CalendarIcon className="size-[18px] shrink-0" aria-hidden />
                  {formatDateLong(event.date)}
                </li>
                <li className="flex items-center gap-2 lg:gap-2.5">
                  <ClockIcon className="size-[18px] shrink-0" aria-hidden />
                  {event.startTime} h
                </li>
                <li className="flex items-center gap-2 lg:gap-2.5">
                  <MapPinIcon className="size-[18px] shrink-0" aria-hidden />
                  {event.venue}, {event.city}
                </li>
              </ul>
              <div className="mt-auto hidden items-center gap-2.5 lg:flex">
                {soldOut ? (
                  <span className="flex h-[54px] grow items-center justify-center rounded-2xl bg-white/15 text-base font-semibold">Agotado</span>
                ) : (
                  <Link href={ticketsHref} className={`${ctaClass} h-[54px] grow rounded-2xl text-base`}>
                    Comprar entradas · desde {priceFrom}
                  </Link>
                )}
                <EventActions title={event.title} variant="hero" />
              </div>
            </div>
          </div>
        </section>

        <div className="grid items-start gap-10 px-4 pt-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14 lg:px-0 lg:pt-14 lg:pb-[72px]">
          <div className="flex flex-col gap-8 lg:gap-12">
            <section className="flex flex-col gap-3 lg:gap-4">
              <h2 className="text-xl font-bold tracking-[-0.02em] lg:text-2xl">Acerca del evento</h2>
              <p className="text-[15px] leading-relaxed text-muted-foreground lg:text-base lg:leading-[1.65]">{event.description}</p>
            </section>

            <section className="flex flex-col gap-3 lg:gap-4">
              <h2 className="text-xl font-bold tracking-[-0.02em] lg:text-2xl">Información importante</h2>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4">
                {info.map((item) => (
                  <div key={item.label} className="flex items-center gap-3.5 rounded-[18px] border border-border px-4 py-3.5 lg:px-5 lg:py-[18px]">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-accent text-primary">
                      <item.icon className="size-5" aria-hidden />
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-[13px] text-muted-foreground">{item.label}</dt>
                      <dd className="text-[15px] font-semibold lg:text-base">{item.value}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </section>

            <section className="flex flex-col gap-2 lg:hidden">
              <h2 className="text-xl font-bold tracking-[-0.02em]">Entradas</h2>
              {tiers}
            </section>

            <section className="flex flex-col gap-3 lg:gap-4">
              <h2 className="text-xl font-bold tracking-[-0.02em] lg:text-2xl">Lugar</h2>
              <div className="overflow-hidden rounded-[22px] border border-border">
                <div className="flex h-[180px] flex-col items-center justify-center gap-2.5 bg-accent text-[#4338ca] lg:h-60" aria-hidden>
                  <MapPinIcon className="size-8" />
                  <span className="text-sm font-semibold">{event.venue}</span>
                </div>
                <div className="flex items-center justify-between gap-4 px-4 py-4 lg:px-6 lg:py-5">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-base font-semibold lg:text-[17px]">{event.venue}</span>
                    <span className="text-[13px] text-muted-foreground lg:text-sm">
                      {event.address}, {event.city}
                    </span>
                  </div>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-11 shrink-0 items-center rounded-xl border-[1.5px] border-strong px-4 text-sm font-semibold text-foreground hover:bg-muted hover:text-foreground"
                  >
                    Cómo llegar
                  </a>
                </div>
              </div>
            </section>
          </div>

          <aside aria-label="Entradas" className="sticky top-24 hidden flex-col gap-5 rounded-3xl border border-border bg-card p-7 shadow-[0_20px_40px_-28px_rgba(24,24,27,.35)] lg:flex">
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] text-muted-foreground">Entradas desde</span>
              <span className="text-[30px] font-bold tracking-[-0.02em] text-price">{priceFrom}</span>
            </div>
            {tiers}
            {soldOut ? (
              <span className="flex h-14 items-center justify-center rounded-2xl bg-muted text-base font-semibold text-muted-foreground">Agotado</span>
            ) : (
              <Link href={ticketsHref} className={`${ctaClass} h-14 rounded-2xl text-base`}>
                Elegir entradas
                <ArrowRightIcon className="size-[18px]" aria-hidden />
              </Link>
            )}
            <p className="flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
              <ShieldCheckIcon className="size-4" aria-hidden />
              Pago seguro · Entrada digital con QR
            </p>
          </aside>
        </div>
      </div>

      {/* Related */}
      <section className="mt-10 bg-canvas lg:mt-0">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 pt-8 pb-9 lg:gap-7 lg:px-20 lg:pt-16 lg:pb-20">
          <div className="flex items-end justify-between px-4 lg:px-0">
            <h2 className="text-xl font-bold tracking-[-0.02em] lg:text-[28px]">También te puede interesar</h2>
            <Link
              href={`/events?category=${encodeURIComponent(event.category)}`}
              className="hidden h-11 items-center gap-1.5 text-[15px] font-semibold text-primary lg:flex"
            >
              Ver más {event.category.toLowerCase()}
              <ArrowRightIcon className="size-[18px]" aria-hidden />
            </Link>
          </div>
          <div className="scrollbar-none flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:px-0">
            {related.map((item) => (
              <RelatedEventCard key={item.id} event={item} />
            ))}
          </div>
        </div>
      </section>

      {/* Mobile purchase bar */}
      <div className="sticky bottom-0 z-30 flex items-center justify-between gap-3 border-t border-border bg-background px-4 pt-3 pb-5 shadow-[0_-12px_24px_-18px_rgba(24,24,27,.35)] lg:hidden">
        <span className="flex flex-col">
          <span className="text-xs text-muted-foreground">Desde</span>
          <span className="text-[22px] font-bold tracking-[-0.02em] text-price">{priceFrom}</span>
        </span>
        {soldOut ? (
          <span className="flex h-[52px] items-center rounded-[15px] bg-muted px-[22px] text-[15px] font-semibold text-muted-foreground">Agotado</span>
        ) : (
          <Link href={ticketsHref} className={`${ctaClass} h-[52px] rounded-[15px] px-[22px] text-[15px]`}>
            Comprar entradas
            <ArrowRightIcon className="size-[18px]" aria-hidden />
          </Link>
        )}
      </div>
    </>
  );
}
