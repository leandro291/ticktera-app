import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { formatPrice, type Currency } from "@/modules/event";
import { cn } from "@/lib/utils";
import { formatSeatList, formatTicketCount, type CartSummary } from "../lib/cart-summary";

interface OrderSummaryProps {
  summary: CartSummary;
  currency: Currency;
  continueHref: string;
}

function ContinueButton({ enabled, href, className }: { enabled: boolean; href: string; className: string }) {
  const base = cn("flex items-center justify-center gap-2 font-semibold", className);
  return enabled ? (
    <Link href={href} className={cn(base, "bg-cta text-cta-foreground hover:bg-cta-hover hover:text-cta-foreground")}>
      Continuar
      <ArrowRightIcon className="size-[18px]" aria-hidden />
    </Link>
  ) : (
    <span aria-disabled="true" className={cn(base, "bg-border text-muted-foreground")}>
      Continuar
    </span>
  );
}

/** Desktop sidebar summary. */
export function OrderSummary({ summary, currency, continueHref }: OrderSummaryProps) {
  const hasItems = summary.count > 0;
  return (
    <aside
      aria-label="Resumen de la compra"
      className="sticky top-24 hidden flex-col gap-5 rounded-3xl border border-border bg-card p-7 shadow-[0_20px_40px_-28px_rgba(24,24,27,.35)] lg:flex"
    >
      <h2 className="text-xl font-semibold">Tu compra</h2>
      {hasItems ? (
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
      ) : (
        <p className="rounded-2xl border-[1.5px] border-dashed border-input p-5 text-center text-sm leading-normal text-muted-foreground">
          Todavía no elegiste entradas. Toca una zona o usa los botones +.
        </p>
      )}
      <div className="flex items-baseline justify-between border-t-[1.5px] border-dashed border-input pt-[18px]">
        <span className="text-[15px] font-medium">
          Total <span className="font-normal text-muted-foreground">({formatTicketCount(summary.count)})</span>
        </span>
        <span aria-live="polite" className="text-[28px] font-bold tracking-[-0.02em] tabular-nums">
          {formatPrice(summary.total, currency)}
        </span>
      </div>
      <ContinueButton enabled={hasItems} href={continueHref} className="h-14 rounded-2xl text-base" />
    </aside>
  );
}

/** Mobile sticky purchase bar. */
export function OrderSummaryBar({ summary, currency, continueHref }: OrderSummaryProps) {
  return (
    <div className="sticky bottom-0 z-30 flex items-center justify-between gap-3 border-t border-border bg-background px-4 pt-3 pb-5 shadow-[0_-12px_24px_-18px_rgba(24,24,27,.35)] lg:hidden">
      <span aria-live="polite" className="flex flex-col">
        <span className="text-xs text-muted-foreground">Total · {formatTicketCount(summary.count)}</span>
        <span className="text-[22px] font-bold tracking-[-0.02em] tabular-nums">{formatPrice(summary.total, currency)}</span>
      </span>
      <ContinueButton enabled={summary.count > 0} href={continueHref} className="h-[52px] rounded-[15px] px-6 text-[15px]" />
    </div>
  );
}
