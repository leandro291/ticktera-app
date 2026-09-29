import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/modules/event";
import { getMinPrice } from "../lib/event-draft";
import type { EventDraft } from "../types/organizer-event";

const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SET", "OCT", "NOV", "DIC"];
const notch = "absolute size-5 rounded-full border border-border bg-canvas";

function dateBadge(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { day: "--", month: "MES" };
  return { day: date.slice(8, 10), month: MONTHS[Number(date.slice(5, 7)) - 1] };
}

/**
 * Live preview of how buyers will see the event in the listing. Mirrors the catalog `EventCard`
 * (horizontal on mobile, vertical from `lg`) but with placeholders and without a link.
 */
export function EventFormPreview({ draft, className }: { draft: EventDraft; className?: string }) {
  const { day, month } = dateBadge(draft.date);
  const minPrice = getMinPrice(draft.tiers);
  const price = minPrice === null ? "S/ —" : formatPrice(minPrice);
  const place = [draft.venue.trim(), draft.city.trim()].filter(Boolean).join(" · ") || "Lugar · Ciudad";
  const title = draft.title.trim();

  return (
    <aside aria-label="Vista previa" className={cn("flex flex-col gap-2.5 lg:gap-3", className)}>
      <span className="text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase lg:text-[13px]">Vista previa</span>
      <div className="relative flex h-[132px] overflow-hidden rounded-[20px] border border-border bg-card lg:h-auto lg:flex-col lg:rounded-[22px]">
        <span className="relative flex w-[108px] shrink-0 items-center justify-center bg-indigo-100 text-indigo-700 lg:h-[180px] lg:w-full">
          {draft.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- local data URL preview
            <img src={draft.image} alt="" className="absolute inset-0 size-full object-cover" />
          ) : (
            <ImageIcon className="size-7 lg:size-9" aria-hidden />
          )}
          <span className="absolute top-2 left-2 flex w-11 flex-col items-center rounded-[11px] bg-white pt-1 pb-[5px] lg:top-3 lg:left-3 lg:w-14 lg:rounded-[14px] lg:pt-1.5 lg:pb-[7px]">
            <span className="text-[10px] font-bold tracking-[0.08em] text-primary lg:text-[11px]">{month}</span>
            <span className="text-[17px] leading-[1.05] font-bold text-foreground lg:text-[22px]">{day}</span>
          </span>
        </span>

        <span className="relative flex min-w-0 grow flex-col gap-1 border-l-[1.5px] border-dashed border-input px-3.5 py-3 lg:gap-2 lg:border-l-0 lg:px-5 lg:pt-[18px] lg:pb-0">
          <span className={`${notch} -top-2.5 -left-2.5 lg:hidden`} />
          <span className={`${notch} -bottom-2.5 -left-2.5 lg:hidden`} />
          <span className="text-[11px] font-semibold tracking-[0.06em] text-primary uppercase lg:text-xs">{draft.category}</span>
          <span
            className={cn(
              "line-clamp-2 text-[15px] leading-[1.3] font-semibold [overflow-wrap:anywhere] lg:min-h-[46px] lg:text-[17px] lg:leading-[1.35]",
              !title && "text-zinc-500",
            )}
          >
            {title || "Nombre del evento"}
          </span>
          <span className="truncate text-xs text-muted-foreground lg:text-sm">{place}</span>
          <span className="mt-auto flex items-baseline gap-1.5 lg:hidden">
            <span className="text-xs text-muted-foreground">Desde</span>
            <span className="text-base font-bold text-price">{price}</span>
          </span>
        </span>

        <span className="relative mt-[18px] hidden border-t-[1.5px] border-dashed border-input lg:block">
          <span className={`${notch} -top-2.5 -left-2.5`} />
          <span className={`${notch} -top-2.5 -right-2.5`} />
        </span>
        <span className="hidden items-center justify-between px-5 pt-4 pb-5 lg:flex">
          <span className="flex flex-col">
            <span className="text-xs text-muted-foreground">Desde</span>
            <span className="text-[19px] font-bold text-price">{price}</span>
          </span>
          <span className="flex h-11 items-center rounded-xl border-[1.5px] border-strong px-4 text-sm font-semibold">Ver entradas</span>
        </span>
      </div>
      <p className="hidden text-[13px] leading-normal text-muted-foreground lg:block">Así verán tu evento los compradores en el listado.</p>
    </aside>
  );
}
