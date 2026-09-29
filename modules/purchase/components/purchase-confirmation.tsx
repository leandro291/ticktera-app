"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, CalendarPlusIcon, CheckIcon, DownloadIcon, MailIcon, QrCodeIcon, TicketIcon } from "lucide-react";
import { DecorativeQr } from "@/components/shared/decorative-qr";
import { formatDateLong, formatPrice } from "@/modules/event";
import { buildOrderIcs } from "../lib/calendar";
import { useOrderStore } from "../store/use-order-store";

const NEXT_STEPS = [
  { icon: MailIcon, title: "Revisa tu correo", text: "Ahí llegan tus entradas y el comprobante de pago." },
  { icon: QrCodeIcon, title: "Muestra tu QR", text: "Cada entrada tiene su propio QR. Muéstralo desde tu celular en el ingreso." },
  { icon: TicketIcon, title: "Todo en Mis entradas", text: "Entra con tu cuenta para ver y descargar tus entradas cuando quieras." },
];

const notch = "absolute size-6 rounded-full border border-border bg-canvas";
const secondaryButton =
  "flex h-[50px] items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-input bg-background text-sm font-medium hover:border-foreground lg:h-[54px] lg:gap-2 lg:rounded-2xl lg:px-[22px] lg:text-[15px]";

export function PurchaseConfirmation() {
  const order = useOrderStore((s) => s.lastOrder);

  if (!order) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-20 text-center">
        <h1 className="text-xl font-semibold">No hay una compra reciente</h1>
        <p className="text-[15px] text-muted-foreground">Cuando completes un pago, verás aquí tu confirmación.</p>
        <Link href="/events" className="mt-2 flex h-12 items-center rounded-[14px] bg-strong px-6 text-[15px] font-semibold text-white hover:bg-zinc-700 hover:text-white">
          Explorar eventos
        </Link>
      </div>
    );
  }

  const { event } = order;
  const zones = order.items.map((i) => i.zoneName);
  const facts = [
    { label: "Zona", value: zones.length > 1 ? `${zones[0]} +${zones.length - 1}` : zones[0] },
    { label: "Entradas", value: String(order.count) },
    { label: "Total pagado", value: formatPrice(order.total, order.currency) },
  ];
  const seatLabels = order.items.filter((i) => i.seatLabel).map((i) => `${i.zoneName}: ${i.seatLabel}`);

  const downloadCalendar = () => {
    const url = URL.createObjectURL(new Blob([buildOrderIcs(order)], { type: "text/calendar" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: `${order.code}.ics` });
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-6 px-4 pt-7 pb-9 lg:items-center lg:gap-9 lg:px-0 lg:pt-14 lg:pb-[72px]">
      <div className="flex flex-col items-center gap-3 text-center lg:gap-3.5">
        <span className="flex size-16 items-center justify-center rounded-full bg-green-100 text-green-700 lg:size-[76px]">
          <CheckIcon className="size-8 lg:size-9" strokeWidth={2.5} aria-hidden />
        </span>
        <h1 className="text-[28px] leading-[1.15] font-bold tracking-[-0.025em] lg:text-[40px] lg:leading-[1.1]">¡Compra confirmada!</h1>
        <p className="max-w-[520px] text-[15px] leading-normal text-muted-foreground lg:text-[17px] lg:leading-[1.55]">
          Enviamos tus entradas a {order.email ? <strong className="font-semibold text-foreground">{order.email}</strong> : "tu correo"}. También las tienes siempre en Mis entradas.
        </p>
        <span className="flex h-[34px] items-center rounded-full border border-border bg-background px-3.5 text-[13px] text-zinc-700 lg:h-9 lg:px-4 lg:text-sm">
          Pedido N.º <strong className="ml-1.5 font-semibold text-foreground">{order.code}</strong>
        </span>
      </div>

      <article className="flex w-full flex-col overflow-hidden rounded-3xl border border-border bg-card lg:h-[232px] lg:flex-row">
        <span className="relative h-[130px] shrink-0 lg:h-auto lg:w-[200px]">
          <Image src={event.image} alt="" fill sizes="(min-width: 1024px) 200px, 100vw" className="object-cover" />
        </span>
        <div className="flex grow flex-col gap-1.5 px-5 py-[18px] lg:gap-2 lg:px-7 lg:py-[26px]">
          <span className="text-[11px] font-semibold tracking-[0.06em] text-primary uppercase lg:text-xs">{event.category}</span>
          <h2 className="text-xl leading-tight font-bold tracking-[-0.02em] lg:text-2xl">{event.title}</h2>
          <p className="text-sm text-muted-foreground lg:text-[15px]">
            {formatDateLong(event.date)} · {event.venue}, {event.city}
          </p>
          {seatLabels.length > 0 && <p className="text-[13px] text-muted-foreground">{seatLabels.join(" · ")}</p>}
          <dl className="mt-2 grid grid-cols-3 gap-2 lg:mt-auto lg:flex lg:gap-7">
            {facts.map((f) => (
              <div key={f.label} className="flex flex-col">
                <dt className="text-[11px] text-muted-foreground lg:text-xs">{f.label}</dt>
                <dd className="text-sm font-semibold lg:text-base">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative flex flex-col items-center justify-center gap-2.5 border-t-[1.5px] border-dashed border-input p-[22px] lg:w-[220px] lg:shrink-0 lg:border-t-0 lg:border-l-[1.5px] lg:p-0">
          <span className={`${notch} -top-3 -left-3`} />
          <span className={`${notch} -top-3 -right-3 lg:right-auto lg:-bottom-3 lg:top-auto lg:-left-3`} />
          <DecorativeQr seed={`${order.code}-1`} className="size-[168px] lg:size-[126px]" />
          <span className="text-[13px] text-muted-foreground">Entrada 1 de {order.count}</span>
        </div>
      </article>

      <div className="flex w-full flex-col gap-2.5 lg:w-auto lg:flex-row lg:gap-3">
        <Link
          href="/my-tickets"
          className="flex h-[54px] items-center justify-center gap-2 rounded-2xl bg-primary px-[26px] text-base font-semibold text-primary-foreground hover:bg-indigo-700 hover:text-primary-foreground"
        >
          Ver mis entradas
          <ArrowRightIcon className="size-[18px]" aria-hidden />
        </Link>
        <div className="grid grid-cols-2 gap-2.5 lg:flex lg:gap-3">
          <button type="button" onClick={downloadCalendar} className={secondaryButton}>
            <CalendarPlusIcon className="size-[18px]" aria-hidden />
            <span className="lg:hidden">Calendario</span>
            <span className="hidden lg:inline">Agregar al calendario</span>
          </button>
          <button type="button" onClick={() => window.print()} className={secondaryButton}>
            <DownloadIcon className="size-[18px]" aria-hidden />
            Descargar PDF
          </button>
        </div>
      </div>

      <section className="flex w-full flex-col gap-2.5 lg:mt-3">
        <h2 className="text-lg font-semibold lg:sr-only">Qué sigue</h2>
        <ol className="flex flex-col gap-2.5 lg:grid lg:grid-cols-3 lg:gap-4">
          {NEXT_STEPS.map((step) => (
            <li
              key={step.title}
              className="flex items-center gap-3.5 rounded-[18px] border border-border bg-card px-4 py-3.5 lg:flex-col lg:items-start lg:gap-2.5 lg:rounded-[20px] lg:p-5"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-accent text-primary">
                <step.icon className="size-5" aria-hidden />
              </span>
              <span className="flex flex-col gap-0.5 lg:gap-2.5">
                <span className="text-[15px] font-semibold lg:text-base">{step.title}</span>
                <span className="text-[13px] leading-normal text-muted-foreground lg:text-sm">{step.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
