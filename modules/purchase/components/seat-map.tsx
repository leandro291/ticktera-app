"use client";

import { useMemo, useRef, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { MaximizeIcon, MinusIcon, PlusIcon } from "lucide-react";
import { formatPrice, type Currency } from "@/modules/event";
import { cn } from "@/lib/utils";
import { SEAT_SIZE } from "../lib/seat-layout";
import type { Seat, SeatSection, ZoneTier } from "../types/venue";

interface SeatMapProps {
  tier: ZoneTier;
  section: SeatSection;
  currency: Currency;
  selectedSeatIds: string[];
  /** True when the zone reached the per-zone limit: free seats can't be added. */
  atLimit: boolean;
  onToggle: (seat: Seat) => void;
  /** Initial framing: `overview` fits the whole section; `touch` starts at a finger-sized seat scale (phones). */
  framing?: "overview" | "touch";
  className?: string;
}

/** ~24px seats: comfortable to tap while still showing context. */
const TOUCH_SCALE = 1.1;

type Direction = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown";

const controlClass = "flex size-10 items-center justify-center rounded-xl text-foreground hover:bg-muted disabled:opacity-40";

export function SeatMap({ tier, section, currency, selectedSeatIds, atLimit, onToggle, framing = "overview", className }: SeatMapProps) {
  const selected = useMemo(() => new Set(selectedSeatIds), [selectedSeatIds]);
  const grid = useMemo(() => {
    const rows = new Map<string, Seat[]>();
    for (const seat of section.seats) rows.set(seat.row, [...(rows.get(seat.row) ?? []), seat]);
    return [...rows.values()];
  }, [section.seats]);
  const [focusedId, setFocusedId] = useState(() => section.seats.find((s) => !s.taken)?.id ?? section.seats[0]?.id);
  const seatRefs = useRef(new Map<string, SVGRectElement>());
  // A drag that pans the map must not toggle the seat under the pointer.
  const panned = useRef(false);

  const price = formatPrice(tier.price, currency);

  const move = (seat: Seat, key: Direction) => {
    const r = grid.findIndex((row) => row[0].row === seat.row);
    const c = grid[r].findIndex((s) => s.id === seat.id);
    const [nr, nc] = { ArrowLeft: [r, c - 1], ArrowRight: [r, c + 1], ArrowUp: [r - 1, c], ArrowDown: [r + 1, c] }[key];
    const target = grid[nr]?.[Math.min(nc, (grid[nr]?.length ?? 1) - 1)];
    if (!target || nc < 0) return;
    setFocusedId(target.id);
    seatRefs.current.get(target.id)?.focus();
  };

  const onKeyDown = (seat: Seat) => (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle(seat);
    } else if (event.key.startsWith("Arrow")) {
      event.preventDefault();
      move(seat, event.key as Direction);
    }
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <TransformWrapper
        minScale={0.3}
        maxScale={4}
        fitOnInit={framing === "overview" ? "contain" : undefined}
        initialScale={framing === "touch" ? TOUCH_SCALE : undefined}
        centerOnInit
        doubleClick={{ disabled: true }}
        onPanningStart={() => {
          panned.current = false;
        }}
        onPanning={() => {
          panned.current = true;
        }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <div className="relative flex min-h-[340px] grow flex-col overflow-hidden rounded-2xl border border-border bg-surface lg:min-h-[400px]">
            <div className="m-2 mb-0 rounded-[10px] bg-strong py-1.5 text-center text-[10px] font-bold tracking-[0.16em] text-white" aria-hidden>
              ESCENARIO
            </div>
            <TransformComponent wrapperClass="size-full! grow cursor-grab active:cursor-grabbing" contentClass="py-3">
              <svg
                width={section.width}
                height={section.height}
                viewBox={`0 0 ${section.width} ${section.height}`}
                role="group"
                aria-label={`Butacas de ${tier.name}`}
                className="touch-none select-none"
              >
                {section.rows.map((row) => (
                  <g key={row.label} className="fill-muted-foreground text-[11px] font-semibold" aria-hidden>
                    <text x={14} y={row.y} dominantBaseline="central" textAnchor="middle">{row.label}</text>
                    <text x={section.width - 14} y={row.y} dominantBaseline="central" textAnchor="middle">{row.label}</text>
                  </g>
                ))}
                {section.seats.map((seat) => {
                  const isSelected = selected.has(seat.id);
                  const disabled = seat.taken || (atLimit && !isSelected);
                  return (
                    <rect
                      key={seat.id}
                      ref={(el) => {
                        if (el) seatRefs.current.set(seat.id, el);
                        else seatRefs.current.delete(seat.id);
                      }}
                      x={seat.x}
                      y={seat.y}
                      width={SEAT_SIZE}
                      height={SEAT_SIZE}
                      rx={6}
                      role="checkbox"
                      aria-checked={isSelected}
                      aria-disabled={disabled}
                      aria-label={`Fila ${seat.row}, asiento ${seat.number}, ${seat.taken ? "ocupado" : price}`}
                      tabIndex={seat.id === focusedId ? 0 : -1}
                      onFocus={() => setFocusedId(seat.id)}
                      onKeyDown={onKeyDown(seat)}
                      onClick={() => {
                        if (!panned.current) onToggle(seat);
                      }}
                      className={cn(
                        "stroke-[1.5] outline-none focus-visible:stroke-strong focus-visible:stroke-[3]",
                        seat.taken
                          ? "cursor-not-allowed fill-border stroke-border"
                          : isSelected
                            ? "cursor-pointer fill-primary stroke-primary"
                            : cn("fill-white stroke-[#818cf8]", disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:fill-accent"),
                      )}
                    />
                  );
                })}
              </svg>
            </TransformComponent>
            <div className="absolute right-3 bottom-3 z-10 flex gap-0.5 rounded-2xl border border-border bg-background p-1 shadow-sm">
              <button type="button" aria-label="Acercar" onClick={() => zoomIn()} className={controlClass}>
                <PlusIcon className="size-[18px]" aria-hidden />
              </button>
              <button type="button" aria-label="Alejar" onClick={() => zoomOut()} className={controlClass}>
                <MinusIcon className="size-[18px]" aria-hidden />
              </button>
              <button type="button" aria-label="Ver mapa completo" onClick={() => resetTransform()} className={controlClass}>
                <MaximizeIcon className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        )}
      </TransformWrapper>

      <ul aria-label="Leyenda" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span className="size-3.5 rounded-[4px] border-[1.5px] border-[#818cf8] bg-white" aria-hidden />
          Disponible
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3.5 rounded-[4px] bg-primary" aria-hidden />
          Seleccionada
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3.5 rounded-[4px] bg-border" aria-hidden />
          Ocupada
        </li>
        <li className="ml-auto hidden text-xs sm:block">Arrastra para moverte · usa + / − para acercar</li>
      </ul>
    </div>
  );
}
