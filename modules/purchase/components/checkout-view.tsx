"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDownIcon, LoaderCircleIcon, LockIcon, ShoppingCartIcon, TimerIcon, TimerOffIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDateShort, formatPrice, type EventDetail, type EventSummary } from "@/modules/event";
import { cn } from "@/lib/utils";
import { useCountdown } from "../hooks/use-countdown";
import { useEventCart } from "../hooks/use-event-cart";
import { formatSeatList, formatTicketCount, type CartSummary } from "../lib/cart-summary";
import { createOrder, generateOrderCode } from "../lib/order";
import { formatCountdown } from "../lib/payment-format";
import { useCartStore } from "../store/use-cart-store";
import { useOrderStore } from "../store/use-order-store";
import type { PaymentMethod } from "../types/order";
import type { EventVenue } from "../types/venue";
import { CheckoutFields } from "./checkout-fields";

const HOLD_SECONDS = 10 * 60;
const FORM_ID = "checkout-form";

interface CheckoutViewProps {
  event: EventDetail | null;
  venue: EventVenue | null;
}

export function CheckoutView({ event, venue }: CheckoutViewProps) {
  if (!event || !venue) return <CheckoutEmpty />;
  return <CheckoutContent event={event} venue={venue} />;
}

function CheckoutEmpty() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-20 text-center">
      <span className="flex size-14 items-center justify-center rounded-[18px] bg-accent text-primary">
        <ShoppingCartIcon className="size-6" aria-hidden />
      </span>
      <h1 className="text-xl font-semibold">Tu carrito está vacío</h1>
      <p className="text-[15px] leading-relaxed text-muted-foreground">Elige un evento y tus entradas para continuar con la compra.</p>
      <Link href="/events" className="mt-2 flex h-12 items-center rounded-[14px] bg-strong px-6 text-[15px] font-semibold text-white hover:bg-zinc-700 hover:text-white">
        Explorar eventos
      </Link>
    </div>
  );
}

function SummaryLines({ summary, currency }: { summary: CartSummary; currency: EventSummary["currency"] }) {
  return (
    <ul className="flex flex-col gap-3">
      {summary.items.map((item) => (
        <li key={item.tier.id} className="flex flex-col gap-0.5">
          <span className="flex justify-between gap-3 text-[15px]">
            <span>
              {item.quantity} × {item.tier.name}
            </span>
            <span className="font-semibold tabular-nums">{formatPrice(item.amount, currency)}</span>
          </span>
          {item.seats.length > 0 && <span className="text-[13px] text-muted-foreground">{formatSeatList(item.seats)}</span>}
        </li>
      ))}
    </ul>
  );
}

function PayButton({ label, enabled, paying, className }: { label: string; enabled: boolean; paying: boolean; className: string }) {
  return (
    <button
      type="submit"
      form={FORM_ID}
      disabled={!enabled || paying}
      className={cn(
        "flex w-full items-center justify-center gap-2 font-semibold",
        enabled ? "bg-cta text-cta-foreground hover:bg-cta-hover" : "cursor-not-allowed bg-border text-muted-foreground",
        className,
      )}
    >
      {paying ? <LoaderCircleIcon className="size-[18px] animate-spin" aria-hidden /> : <LockIcon className="size-[18px]" aria-hidden />}
      {paying ? "Procesando pago…" : label}
    </button>
  );
}

function CheckoutContent({ event, venue }: { event: EventDetail; venue: EventVenue }) {
  const router = useRouter();
  const { summary } = useEventCart(venue);
  const clearCart = useCartStore((s) => s.clear);
  const placeOrder = useOrderStore((s) => s.placeOrder);
  const secondsLeft = useCountdown(HOLD_SECONDS);
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [accepted, setAccepted] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [paying, setPaying] = useState(false);

  if (summary.count === 0 && !paying) return <CheckoutEmpty />;

  const expired = secondsLeft === 0;
  const total = formatPrice(summary.total, event.currency);
  const canPay = accepted && !expired;
  const ticketsHref = `/events/${event.id}/tickets`;
  const eventLine = `${formatDateShort(event.date)} · ${event.venue}, ${event.city}`;

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canPay || paying) return;
    const data = new FormData(e.currentTarget);
    const buyerName = String(data.get("name") ?? "");
    const email = String(data.get("email") ?? "");
    setPaying(true);
    // Simulated payment round-trip.
    setTimeout(() => {
      placeOrder(createOrder({ code: generateOrderCode(), event, summary, buyerName, email, paymentMethod: method }));
      clearCart();
      router.push("/checkout/confirmation");
    }, 900);
  };

  return (
    <>
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 lg:px-20 lg:pt-6">
        {expired ? (
          <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-[15px] text-red-800 lg:flex-row lg:items-center lg:justify-between">
            <span className="flex items-center gap-3">
              <TimerOffIcon className="size-5 shrink-0" aria-hidden />
              Se acabó el tiempo y liberamos tus entradas.
            </span>
            <Link href={ticketsHref} className="font-semibold text-red-800 underline underline-offset-4 hover:text-red-900">
              Volver a elegir entradas
            </Link>
          </div>
        ) : (
          <p className="flex min-h-14 items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-warning-foreground lg:px-5 lg:text-[15px]">
            <TimerIcon className="size-5 shrink-0" aria-hidden />
            <span>
              Reservamos tus entradas por <strong className="tabular-nums">{formatCountdown(secondsLeft)}</strong>. Completa el pago antes de que se liberen.
            </span>
          </p>
        )}
      </div>

      <form
        id={FORM_ID}
        onSubmit={submit}
        className="mx-auto grid w-full max-w-[1440px] items-start gap-4 px-4 pt-4 pb-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-8 lg:px-20 lg:pt-6 lg:pb-20"
      >
        <div className="flex min-w-0 flex-col gap-4 lg:gap-6">
          {/* Mobile collapsible summary */}
          <section className="overflow-hidden rounded-[20px] border border-border bg-card lg:hidden">
            <button
              type="button"
              aria-expanded={summaryOpen}
              onClick={() => setSummaryOpen((o) => !o)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <span className="relative size-12 shrink-0 overflow-hidden rounded-xl">
                <Image src={event.image} alt="" fill sizes="48px" className="object-cover" />
              </span>
              <span className="flex min-w-0 grow flex-col gap-px">
                <span className="truncate text-[15px] font-semibold">{event.title}</span>
                <span className="text-[13px] text-muted-foreground">
                  {formatTicketCount(summary.count)} · {total}
                </span>
              </span>
              <ChevronDownIcon className={cn("size-5 shrink-0 transition-transform", summaryOpen && "rotate-180")} aria-hidden />
            </button>
            {summaryOpen && (
              <div className="flex flex-col gap-2.5 px-4 pb-4 text-sm">
                <p className="border-t border-divider pt-3 text-muted-foreground">{eventLine}</p>
                <SummaryLines summary={summary} currency={event.currency} />
                <Link href={ticketsHref} className="w-fit font-semibold">
                  Cambiar entradas
                </Link>
              </div>
            )}
          </section>

          <CheckoutFields method={method} onMethodChange={setMethod} disabled={expired || paying} />

          <label className="flex cursor-pointer items-start gap-3 px-1 text-sm leading-normal text-zinc-700 lg:items-center lg:px-0">
            <Checkbox checked={accepted} onCheckedChange={setAccepted} disabled={expired} className="mt-px size-[22px] lg:mt-0 lg:size-5" />
            <span>
              Acepto los <Link href="#">Términos y condiciones</Link> y la <Link href="#">Política de privacidad</Link>.
            </span>
          </label>
        </div>

        <aside
          aria-label="Resumen de la compra"
          className="sticky top-24 hidden flex-col gap-5 rounded-3xl border border-border bg-card p-7 shadow-[0_20px_40px_-28px_rgba(24,24,27,.35)] lg:flex"
        >
          <div className="flex items-center gap-3.5">
            <span className="relative size-16 shrink-0 overflow-hidden rounded-2xl">
              <Image src={event.image} alt="" fill sizes="64px" className="object-cover" />
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-base font-semibold">{event.title}</span>
              <span className="text-[13px] text-muted-foreground">{eventLine}</span>
            </div>
          </div>
          <div className="border-t border-divider pt-[18px]">
            <SummaryLines summary={summary} currency={event.currency} />
          </div>
          <Link href={ticketsHref} className="w-fit text-sm font-semibold">
            Cambiar entradas
          </Link>
          <div className="flex items-baseline justify-between border-t-[1.5px] border-dashed border-input pt-[18px]">
            <span className="text-[15px] font-medium">Total</span>
            <span className="text-[28px] font-bold tracking-[-0.02em] tabular-nums">{total}</span>
          </div>
          <PayButton label={`Pagar ${total}`} enabled={canPay} paying={paying} className="h-14 rounded-2xl text-base" />
          {!accepted && !expired && <span className="-mt-2 text-center text-[13px] text-muted-foreground">Acepta los términos para continuar.</span>}
        </aside>
      </form>

      {/* Mobile pay bar */}
      <div className="sticky bottom-0 z-30 flex flex-col gap-2 border-t border-border bg-background px-4 pt-3 pb-5 shadow-[0_-12px_24px_-18px_rgba(24,24,27,.35)] lg:hidden">
        <PayButton label={`Pagar ${total}`} enabled={canPay} paying={paying} className="h-[54px] rounded-2xl text-base" />
        {!accepted && !expired && <span className="text-center text-[13px] text-muted-foreground">Acepta los términos para continuar.</span>}
      </div>
    </>
  );
}
