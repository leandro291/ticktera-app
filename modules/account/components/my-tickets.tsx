"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarIcon, CalendarPlusIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, DownloadIcon, LoaderCircleIcon, MapPinIcon, TicketIcon } from "lucide-react";
import { DecorativeQr } from "@/components/shared/decorative-qr";
import { cn } from "@/lib/utils";
import { EventDateBadge, formatDateLong, formatDateShort } from "@/modules/event";
import { downloadOrderIcs, getOrderTickets, useOrderPdf, usePlacedOrders, type Order } from "@/modules/purchase";
import { SAMPLE_ORDERS } from "../data/sample-orders";
import { splitOrdersByDate, todayIso } from "../lib/split-orders";

type Tab = "upcoming" | "past";

const notch = "absolute -top-3 size-6 rounded-full border border-border bg-canvas";
const navButton = "flex size-11 items-center justify-center rounded-xl border-[1.5px] border-input bg-background disabled:cursor-not-allowed disabled:opacity-40";

const ticketCount = (n: number) => (n === 1 ? "1 entrada" : `${n} entradas`);

function OrderTicket({ order }: { order: Order }) {
  const tickets = getOrderTickets(order);
  const [index, setIndex] = useState(0);
  const pdf = useOrderPdf(order);
  const ticket = tickets[Math.min(index, tickets.length - 1)];
  const { event } = order;
  const zone = ticket.seat ? `${ticket.zoneName} · Fila ${ticket.seat.row}, ${ticket.seat.number}` : ticket.zoneName;
  const facts = [
    { label: "Zona", value: zone },
    { label: "Titular", value: order.buyerName },
    { label: "Código", value: ticket.code, className: "tabular-nums" },
    { label: "Estado", value: "Válida", className: "text-green-700" },
  ];

  return (
    <article className="flex flex-col overflow-hidden rounded-[26px] border border-border bg-card lg:rounded-[28px]">
      <div className="relative h-[150px] bg-border lg:h-[200px]">
        <Image src={event.image} alt="" fill sizes="(min-width: 1024px) 900px, 100vw" className="object-cover" />
        <EventDateBadge date={event.date} className="absolute top-3 left-3 lg:top-4 lg:left-4" />
      </div>
      <div className="flex flex-col gap-2.5 px-5 py-[18px] lg:gap-3.5 lg:px-8 lg:pt-[26px] lg:pb-6">
        <h2 className="text-[21px] leading-tight font-bold tracking-[-0.02em] lg:text-[28px] lg:leading-[1.15]">{event.title}</h2>
        <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground lg:flex-row lg:flex-wrap lg:gap-x-6 lg:gap-y-2 lg:text-[15px]">
          <li className="flex items-center gap-2">
            <CalendarIcon className="size-4 shrink-0" aria-hidden />
            {formatDateLong(event.date)}
          </li>
          {event.startTime && (
            <li className="flex items-center gap-2">
              <ClockIcon className="size-4 shrink-0" aria-hidden />
              {event.startTime} h
            </li>
          )}
          <li className="flex items-center gap-2">
            <MapPinIcon className="size-4 shrink-0" aria-hidden />
            {event.venue}, {event.city}
          </li>
        </ul>
      </div>
      <div className="relative border-t-[1.5px] border-dashed border-input">
        <span className={`${notch} -left-3`} />
        <span className={`${notch} -right-3`} />
      </div>
      <div className="@container px-5 pt-[22px] pb-6 lg:px-8 lg:pt-7 lg:pb-8">
        <div className="flex flex-col items-center gap-[18px] @xl:flex-row @xl:gap-9">
          <div className="size-[220px] shrink-0 rounded-[18px] border border-border bg-white p-3 @xl:size-[200px]">
            <DecorativeQr seed={ticket.code} className="size-full" />
          </div>
          <div className="flex w-full min-w-0 grow flex-col gap-[18px]">
            <div className="flex items-center justify-between gap-2">
              <button type="button" aria-label="Entrada anterior" disabled={index === 0} onClick={() => setIndex((i) => i - 1)} className={cn(navButton, "@xl:hidden")}>
                <ChevronLeftIcon className="size-[18px]" aria-hidden />
              </button>
              <span aria-live="polite" className="text-base font-semibold whitespace-nowrap @xl:text-xl @xl:font-bold">
                Entrada {index + 1} de {tickets.length}
              </span>
              <span className="flex shrink-0 gap-1.5">
                <button type="button" aria-label="Entrada anterior" disabled={index === 0} onClick={() => setIndex((i) => i - 1)} className={cn(navButton, "hidden @xl:flex")}>
                  <ChevronLeftIcon className="size-[18px]" aria-hidden />
                </button>
                <button type="button" aria-label="Entrada siguiente" disabled={index >= tickets.length - 1} onClick={() => setIndex((i) => i + 1)} className={navButton}>
                  <ChevronRightIcon className="size-[18px]" aria-hidden />
                </button>
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 lg:gap-x-6 lg:gap-y-3.5">
              {facts.map((f) => (
                <div key={f.label} className="flex min-w-0 flex-col gap-0.5">
                  <dt className="text-[11px] text-muted-foreground lg:text-xs">{f.label}</dt>
                  <dd className={cn("text-[15px] font-semibold break-words lg:text-base", f.className)}>{f.value}</dd>
                </div>
              ))}
            </dl>
            <div className="grid grid-cols-2 gap-2.5 @xl:flex">
              <button
                type="button"
                onClick={pdf.download}
                disabled={pdf.pending}
                aria-busy={pdf.pending}
                className="flex h-12 items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-strong bg-background px-[18px] text-sm font-semibold whitespace-nowrap disabled:cursor-wait disabled:opacity-70 @xl:gap-2"
              >
                {pdf.pending ? <LoaderCircleIcon className="size-4 animate-spin" aria-hidden /> : <DownloadIcon className="size-4" aria-hidden />}
                {pdf.pending ? "Generando…" : <><span className="@xl:hidden">PDF</span><span className="hidden @xl:inline">Descargar PDF</span></>}
              </button>
              <button
                type="button"
                onClick={() => downloadOrderIcs(order)}
                className="flex h-12 items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-input bg-background px-[18px] text-sm font-medium whitespace-nowrap hover:border-foreground @xl:gap-2"
              >
                <CalendarPlusIcon className="size-4" aria-hidden />
                <span className="@xl:hidden">Calendario</span>
                <span className="hidden @xl:inline">Agregar al calendario</span>
              </button>
            </div>
            {pdf.failed && (
              <p role="alert" className="text-sm font-medium text-destructive">
                No pudimos generar el PDF. Inténtalo de nuevo.
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function MyTickets() {
  const placed = usePlacedOrders();
  const { upcoming, past } = splitOrdersByDate([...placed, ...SAMPLE_ORDERS], todayIso());
  const [tab, setTab] = useState<Tab>("upcoming");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const list = tab === "upcoming" ? upcoming : past;
  const selected = list.find((o) => o.code === selectedCode) ?? list[0];
  const tabs: { key: Tab; label: string }[] = [
    { key: "upcoming", label: `Próximas (${upcoming.length})` },
    { key: "past", label: `Pasadas (${past.length})` },
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px] pb-8 lg:px-20 lg:pb-20">
      <div className="flex flex-col gap-4 px-4 pt-[22px] pb-4 lg:flex-row lg:items-end lg:justify-between lg:px-0 lg:pt-10 lg:pb-7">
        <h1 className="text-[28px] leading-[1.15] font-bold tracking-[-0.025em] lg:text-4xl lg:leading-[1.1]">Mis entradas</h1>
        <div className="grid grid-cols-2 gap-1 rounded-[14px] border border-border bg-background p-1 lg:flex">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              aria-pressed={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn("h-[42px] rounded-[10px] px-[18px] text-sm font-semibold lg:h-10", tab === t.key ? "bg-strong text-white" : "text-foreground hover:bg-muted")}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {selected ? (
        <div className="grid items-start gap-4 lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-8">
          <ul aria-label="Pedidos" className="scrollbar-none flex gap-2.5 overflow-x-auto px-4 lg:flex-col lg:gap-3 lg:overflow-visible lg:px-0">
            {list.map((order) => {
              const current = order.code === selected.code;
              return (
                <li key={order.code} className="shrink-0">
                  <button
                    type="button"
                    aria-current={current}
                    onClick={() => setSelectedCode(order.code)}
                    className={cn(
                      "flex w-[270px] items-center gap-3 rounded-[18px] border-2 bg-card p-2.5 text-left lg:w-full lg:gap-3.5 lg:rounded-[20px] lg:p-3.5",
                      current ? "border-primary" : "border-border hover:border-input",
                    )}
                  >
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-xl lg:size-[72px] lg:rounded-[14px]">
                      <Image src={order.event.image} alt="" fill sizes="72px" className="object-cover" />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5 lg:gap-[3px]">
                      <span className="truncate text-sm font-semibold lg:text-base">{order.event.title}</span>
                      <span className="text-xs text-muted-foreground lg:text-[13px]">
                        {formatDateShort(order.event.date)} · {order.event.city}
                      </span>
                      <span className="truncate text-xs font-medium text-primary lg:text-[13px]">
                        {ticketCount(order.count)} · {order.items.map((i) => i.zoneName).join(", ")}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="px-4 lg:px-0">
            <OrderTicket key={selected.code} order={selected} />
          </div>
        </div>
      ) : (
        <div className="mx-4 flex flex-col items-center gap-3 rounded-[28px] border-[1.5px] border-dashed border-input bg-card px-6 py-16 text-center lg:mx-0 lg:py-20">
          <span className="flex size-14 items-center justify-center rounded-[18px] bg-accent text-primary">
            <TicketIcon className="size-6" aria-hidden />
          </span>
          <span className="text-lg font-semibold lg:text-xl">
            {tab === "past" ? "Aún no tienes eventos pasados" : "Aún no tienes entradas"}
          </span>
          <span className="max-w-[420px] text-[15px] leading-relaxed text-muted-foreground">
            {tab === "past" ? "Cuando vayas a tu primer evento, lo verás aquí." : "Cuando compres entradas, las verás aquí."}
          </span>
          <Link href="/events" className="mt-2 flex h-12 items-center rounded-[14px] bg-strong px-[22px] text-[15px] font-semibold text-white hover:bg-zinc-700 hover:text-white">
            Explorar eventos
          </Link>
        </div>
      )}
    </div>
  );
}
