import Link from "next/link";
import { ArrowLeftIcon, CheckIcon, LockIcon } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

const STEPS = ["Entradas", "Datos y pago", "Confirmación"];

interface PurchaseHeaderProps {
  step: 1 | 2 | 3;
  /** Mobile title, e.g. "Elige tus entradas". */
  title: string;
  backHref?: string;
  backLabel?: string;
}

export function PurchaseHeader({ step, title, backHref, backLabel = "Volver" }: PurchaseHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-divider bg-background">
      {/* Mobile */}
      <div className="flex h-[60px] items-center gap-1 pr-3 pl-1.5 lg:hidden">
        {backHref ? (
          <Link href={backHref} aria-label={backLabel} className="flex size-11 items-center justify-center rounded-xl text-foreground">
            <ArrowLeftIcon className="size-[22px]" aria-hidden />
          </Link>
        ) : (
          <span className="w-2.5" />
        )}
        <div className="flex grow flex-col">
          <span className="text-xs text-muted-foreground">
            Paso {step} de {STEPS.length}
          </span>
          <span className="text-base font-semibold">{title}</span>
        </div>
        <LockIcon className="size-[18px] text-muted-foreground" aria-label="Compra segura" />
      </div>
      <div className="h-[3px] bg-divider lg:hidden" aria-hidden>
        <div className="h-full bg-primary" style={{ width: `${(step / STEPS.length) * 100}%` }} />
      </div>

      {/* Desktop */}
      <div className="mx-auto hidden h-[76px] max-w-[1440px] items-center justify-between px-20 lg:flex">
        <Logo className="w-60" />
        <ol aria-label="Pasos de la compra" className="flex items-center gap-3 text-sm">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const done = n < step;
            const current = n === step;
            return (
              <li key={label} aria-current={current ? "step" : undefined} className="flex items-center gap-3">
                {i > 0 && <span className={cn("h-[1.5px] w-10", done || current ? "bg-strong" : "bg-input")} aria-hidden />}
                <span className={cn("flex items-center gap-2.5", current ? "font-semibold" : "text-muted-foreground")}>
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full text-[13px]",
                      current || done ? "bg-strong text-white" : "border-[1.5px] border-input",
                    )}
                  >
                    {done ? <CheckIcon className="size-4" aria-label="Completado" /> : n}
                  </span>
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
        <span className="flex w-60 items-center justify-end gap-2 text-sm text-muted-foreground">
          <LockIcon className="size-4" aria-hidden />
          Compra segura
        </span>
      </div>
    </header>
  );
}
