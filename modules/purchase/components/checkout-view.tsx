"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, ChevronDownIcon, LoaderCircleIcon, LockIcon, ShoppingCartIcon, TimerIcon, TimerOffIcon, type LucideIcon } from "lucide-react";
import { PageLoading } from "@/components/shared/page-loading";
import { Checkbox } from "@/components/ui/checkbox";
import { formatDateShort, formatPrice, type EventDetail, type EventSummary } from "@/modules/event";
import { useStoreHydrated } from "@/hooks/use-store-hydrated";
import { cn } from "@/lib/utils";
import { startCheckoutAction } from "../actions/checkout-actions";
import { useCountdown } from "../hooks/use-countdown";
import { useEventCart } from "../hooks/use-event-cart";
import { formatTicketCount, type CartSummary } from "../lib/cart-summary";
import { ORDER_HOLD_SECONDS } from "../lib/order-plan";
import { formatCountdown } from "../lib/payment-format";
import { useCartStore } from "../store/use-cart-store";
import type { StartCheckoutResult } from "../types/checkout";
import type { EventVenue } from "../types/venue";
import { CheckoutFields, validateBuyer, type BuyerErrors, type BuyerField, type BuyerValues, type DocumentType } from "./checkout-fields";
import { PAYMENTS_ENABLED, PaymentForm } from "./payment-form";

const DETAILS_FORM_ID = "checkout-form";
const PAYMENT_FORM_ID = "payment-form";
const DOCUMENT_LABELS: Record<DocumentType, string> = { dni: "DNI", ce: "CE", passport: "Pasaporte" };
const BUYER_FIELDS: BuyerField[] = ["fullName", "documentNumber", "phone"];

type Hold = Extract<StartCheckoutResult, { ok: true }>;

interface CheckoutViewProps {
  event: EventDetail | null;
  venue: EventVenue | null;
  /** Datos de la cuenta (el correo es solo lectura) y los guardados en compras anteriores. */
  buyer: BuyerValues;
}

export function CheckoutView({ event, venue, buyer }: CheckoutViewProps) {
  const hydrated = useStoreHydrated(useCartStore);
  if (!event || !venue) return <CheckoutEmpty />;
  if (!hydrated) return <PageLoading />;
  return <CheckoutContent event={event} venue={venue} initialBuyer={buyer} />;
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
        </li>
      ))}
    </ul>
  );
}

interface StepAction {
  form: string;
  label: string;
  busyLabel: string;
  icon: LucideIcon;
  enabled: boolean;
  busy: boolean;
  /** Texto bajo el botón: ayuda o, con `error`, el fallo de la última acción. */
  note?: { text: string; error?: boolean };
}

function ActionButton({ action, className }: { action: StepAction; className: string }) {
  const Icon = action.icon;
  const enabled = action.enabled && !action.busy;
  return (
    <button
      type="submit"
      form={action.form}
      disabled={!enabled}
      className={cn(
        "flex w-full items-center justify-center gap-2 font-semibold",
        enabled || action.busy ? "bg-cta text-cta-foreground hover:bg-cta-hover" : "cursor-not-allowed bg-border text-muted-foreground",
        action.busy && "cursor-wait opacity-80",
        className,
      )}
    >
      {action.busy ? <LoaderCircleIcon className="size-[18px] animate-spin" aria-hidden /> : <Icon className="size-[18px]" aria-hidden />}
      {action.busy ? action.busyLabel : action.label}
    </button>
  );
}

function ActionNote({ note, className }: { note: StepAction["note"]; className?: string }) {
  if (!note) return null;
  return (
    <span role={note.error ? "alert" : undefined} className={cn("text-center text-[13px]", note.error ? "text-destructive" : "text-muted-foreground", className)}>
      {note.text}
    </span>
  );
}

interface CheckoutLayoutProps {
  event: EventDetail;
  summary: CartSummary;
  total: string;
  banner: React.ReactNode;
  action: StepAction;
  children: React.ReactNode;
}

/** Marco común a los dos pasos: aviso arriba, columna del paso, resumen lateral (escritorio) y barra fija (móvil). */
function CheckoutLayout({ event, summary, total, banner, action, children }: CheckoutLayoutProps) {
  const [summaryOpen, setSummaryOpen] = useState(false);
  const ticketsHref = `/events/${event.id}/tickets`;
  const eventLine = `${formatDateShort(event.date)} · ${event.venue}, ${event.city}`;

  return (
    <>
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-4 lg:px-20 lg:pt-6">{banner}</div>

      <div className="mx-auto grid w-full max-w-[1440px] items-start gap-4 px-4 pt-4 pb-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-8 lg:px-20 lg:pt-6 lg:pb-20">
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

          {children}
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
          <ActionButton action={action} className="h-14 rounded-2xl text-base" />
          <ActionNote note={action.note} className="-mt-2" />
        </aside>
      </div>

      {/* Mobile action bar */}
      <div className="sticky bottom-0 z-30 flex flex-col gap-2 border-t border-border bg-background px-4 pt-3 pb-5 shadow-[0_-12px_24px_-18px_rgba(24,24,27,.35)] lg:hidden">
        <ActionButton action={action} className="h-[54px] rounded-2xl text-base" />
        <ActionNote note={action.note} />
      </div>
    </>
  );
}

function CheckoutContent({ event, venue, initialBuyer }: { event: EventDetail; venue: EventVenue; initialBuyer: BuyerValues }) {
  const { summary } = useEventCart(venue);
  const [hold, setHold] = useState<Hold | null>(null);
  const [buyer, setBuyer] = useState(initialBuyer);
  const [accepted, setAccepted] = useState(false);
  const [expired, setExpired] = useState(false);

  // Con la orden creada el carrito ya no manda: el total sale del servidor.
  if (summary.count === 0 && !hold) return <CheckoutEmpty />;

  if (hold) {
    return (
      <PaymentStep
        // Una reserva nueva reinicia la cuenta regresiva.
        key={hold.orderCode}
        event={event}
        summary={summary}
        hold={hold}
        buyer={buyer}
        onEdit={() => setHold(null)}
        onExpire={() => {
          setExpired(true);
          setHold(null);
        }}
      />
    );
  }

  return (
    <DetailsStep
      event={event}
      venue={venue}
      summary={summary}
      defaults={buyer}
      accepted={accepted}
      onAcceptedChange={setAccepted}
      expired={expired}
      onStarted={(result, values) => {
        setExpired(false);
        setBuyer(values);
        setHold(result);
      }}
    />
  );
}

interface DetailsStepProps {
  event: EventDetail;
  venue: EventVenue;
  summary: CartSummary;
  defaults: BuyerValues;
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
  expired: boolean;
  onStarted: (hold: Hold, buyer: BuyerValues) => void;
}

/** Paso 1 (D1): datos del comprador y términos. "Continuar al pago" crea la orden y empieza la reserva. */
function DetailsStep({ event, venue, summary, defaults, accepted, onAcceptedChange, expired, onStarted }: DetailsStepProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<BuyerErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const ticketsHref = `/events/${event.id}/tickets`;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!accepted || starting) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    const values = {
      fullName: text("fullName"),
      phone: text("phone"),
      documentType: text("documentType") as DocumentType,
      documentNumber: text("documentNumber"),
    };

    const found = validateBuyer(values);
    setErrors(found);
    setError(null);
    const firstInvalid = BUYER_FIELDS.find((f) => found[f]);
    if (firstInvalid) {
      (form.elements.namedItem(firstInvalid) as HTMLElement | null)?.focus();
      return;
    }

    setStarting(true);
    try {
      const result = await startCheckoutAction({
        eventSlug: venue.eventId,
        lines: summary.items.map((i) => ({ ticketTypeId: i.tier.id, quantity: i.quantity })),
        buyer: values,
        acceptedTerms: true,
      });
      if (result.ok) {
        onStarted(result, { ...values, email: defaults.email });
        return;
      }
      setError(result.error);
      // Otro comprador se llevó cupo: se recarga la disponibilidad (la página es de servidor).
      if (result.code === "sold-out") router.refresh();
    } catch {
      setError("No se pudo completar la operación. Intenta de nuevo.");
    }
    setStarting(false);
  };

  const note = error ? { text: error, error: true } : !accepted ? { text: "Acepta los términos para continuar." } : undefined;

  return (
    <CheckoutLayout
      event={event}
      summary={summary}
      total={formatPrice(summary.total, event.currency)}
      banner={
        expired ? (
          <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-[15px] text-red-800 lg:flex-row lg:items-center lg:justify-between">
            <span className="flex items-center gap-3">
              <TimerOffIcon className="size-5 shrink-0" aria-hidden />
              Se acabó el tiempo y liberamos tus entradas. Si siguen disponibles, continúa al pago para reservarlas de nuevo.
            </span>
            <Link href={ticketsHref} className="font-semibold text-red-800 underline underline-offset-4 hover:text-red-900">
              Volver a elegir entradas
            </Link>
          </div>
        ) : (
          <p className="flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground lg:px-5 lg:text-[15px]">
            <TimerIcon className="size-5 shrink-0" aria-hidden />
            <span>Al continuar reservamos tus entradas por {ORDER_HOLD_SECONDS / 60} minutos para que completes el pago.</span>
          </p>
        )
      }
      action={{
        form: DETAILS_FORM_ID,
        label: "Continuar al pago",
        busyLabel: "Reservando entradas…",
        icon: ArrowRightIcon,
        enabled: accepted,
        busy: starting,
        note,
      }}
    >
      <form id={DETAILS_FORM_ID} noValidate onSubmit={submit} className="flex flex-col gap-4 lg:gap-6">
        <CheckoutFields defaults={defaults} errors={errors} disabled={starting} />

        <label className="flex cursor-pointer items-start gap-3 px-1 text-sm leading-normal text-zinc-700 lg:items-center lg:px-0">
          <Checkbox checked={accepted} onCheckedChange={onAcceptedChange} disabled={starting} className="mt-px size-[22px] lg:mt-0 lg:size-5" />
          <span>
            Acepto los <Link href="#">Términos y condiciones</Link> y la <Link href="#">Política de privacidad</Link>.
          </span>
        </label>
      </form>
    </CheckoutLayout>
  );
}

interface PaymentStepProps {
  event: EventDetail;
  summary: CartSummary;
  hold: Hold;
  buyer: BuyerValues;
  onEdit: () => void;
  onExpire: () => void;
}

/** Paso 2 (D1): Payment Element con la cuenta regresiva de la reserva (`expiresInSeconds` del servidor). */
function PaymentStep({ event, summary, hold, buyer, onEdit, onExpire }: PaymentStepProps) {
  const secondsLeft = useCountdown(hold.expiresInSeconds);
  const [paying, setPaying] = useState(false);
  const [ready, setReady] = useState(false);
  const expired = secondsLeft === 0;

  // Vencida la reserva se vuelve al paso 1, salvo que haya un pago en curso (3DS): ese se resuelve primero.
  useEffect(() => {
    if (expired && !paying) onExpire();
  }, [expired, paying, onExpire]);

  return (
    <CheckoutLayout
      event={event}
      summary={summary}
      total={formatPrice(hold.totalCents / 100, event.currency)}
      banner={
        expired ? (
          <div role="alert" className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-[15px] text-red-800">
            <TimerOffIcon className="size-5 shrink-0" aria-hidden />
            Se acabó el tiempo y liberamos tus entradas.
          </div>
        ) : (
          <p className="flex min-h-14 items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-warning-foreground lg:px-5 lg:text-[15px]">
            <TimerIcon className="size-5 shrink-0" aria-hidden />
            <span>
              Reservamos tus entradas por <strong className="tabular-nums">{formatCountdown(secondsLeft)}</strong>. Completa el pago antes de que se liberen.
            </span>
          </p>
        )
      }
      action={{
        form: PAYMENT_FORM_ID,
        label: `Pagar ${formatPrice(hold.totalCents / 100, event.currency)}`,
        busyLabel: "Procesando pago…",
        icon: LockIcon,
        enabled: !expired && PAYMENTS_ENABLED && ready,
        busy: paying,
      }}
    >
      <section className="flex flex-col gap-3 rounded-[20px] border border-border bg-card px-4 py-5 lg:rounded-3xl lg:p-7">
        <h2 className="text-lg font-semibold lg:text-xl">Datos del comprador</h2>
        <p className="text-[15px] leading-normal">
          {buyer.fullName} · {DOCUMENT_LABELS[buyer.documentType]} {buyer.documentNumber}
          <br />
          <span className="text-muted-foreground">
            {buyer.email} · {buyer.phone}
          </span>
        </p>
        <button type="button" onClick={onEdit} disabled={paying} className="w-fit text-sm font-semibold text-primary hover:underline disabled:opacity-50">
          Editar datos
        </button>
      </section>

      <PaymentForm clientSecret={hold.clientSecret} orderCode={hold.orderCode} formId={PAYMENT_FORM_ID} disabled={expired} onPayingChange={setPaying} onReadyChange={setReady} />
    </CheckoutLayout>
  );
}
