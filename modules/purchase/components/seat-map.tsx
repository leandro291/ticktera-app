"use client";

import { useId, useMemo, useRef, useState } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { MaximizeIcon, MinusIcon, PlusIcon } from "lucide-react";
import { formatPrice, type Currency } from "@/modules/event";
import { cn } from "@/lib/utils";
import { SEAT_R } from "../lib/seat-layout";
import { halfMoonPath } from "../lib/venue-geometry";
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
const TAKEN_FILL = "#e4e4e7";
const TAKEN_MARK = "#a1a1aa";
const SELECTED_FILL = "#18181b";

type Direction = "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown";

interface Tip {
  seat: Seat;
  x: number;
  y: number;
}

interface View {
  scale: number;
  x: number;
  y: number;
  /** Visible frame size in screen pixels. */
  width: number;
  height: number;
}

const controlClass = "flex size-10 items-center justify-center rounded-xl text-foreground hover:bg-muted disabled:opacity-40";

export const seatLabel = (seat: Pick<Seat, "row" | "number">) => `Fila ${seat.row} · Asiento ${seat.number}`;

/** Half-moon stage (same look as the zone map): flat back wall, round front edge with footlights. */
function Stage({ stage }: { stage: SeatSection["stage"] }) {
  const gradientId = `tk-seat-stage-${useId()}`;
  const { x, y, width, height } = stage;
  const cx = x + width / 2;
  const rx = width / 2;
  const lights = Array.from({ length: 9 }, (_, i) => {
    const t = ((i + 1) / 10) * Math.PI;
    return { x: cx - Math.cos(t) * (rx - 10), y: y + Math.sin(t) * (height - 8) };
  });
  return (
    <g aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#3730a3" />
        </linearGradient>
      </defs>
      <path d={halfMoonPath(cx, y - 1, rx + 5, height + 5)} fill="#c7d2fe" opacity={0.5} />
      <path d={halfMoonPath(cx, y, rx, height)} fill={`url(#${gradientId})`} />
      {lights.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.6} fill="#fde68a" opacity={0.9} />
      ))}
      <text x={cx} y={y + height * 0.42} dominantBaseline="central" textAnchor="middle" className="fill-white text-[11px] font-bold tracking-[0.2em]">
        ESCENARIO
      </text>
    </g>
  );
}

/** Whole-section thumbnail with the visible area, shown while zoomed in (desktop). */
function MiniMap({ section, view }: { section: SeatSection; view: View }) {
  const w = 132;
  const k = w / section.width;
  const h = section.height * k;
  const rect = {
    x: Math.max(0, (-view.x / view.scale) * k),
    y: Math.max(0, (-view.y / view.scale) * k),
    width: Math.min(w, (view.width / view.scale) * k),
    height: Math.min(h, (view.height / view.scale) * k),
  };
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="absolute top-3 left-3 z-10 hidden rounded-lg border border-border bg-background/95 shadow-sm lg:block">
      <path d={halfMoonPath((section.stage.x + section.stage.width / 2) * k, section.stage.y * k, (section.stage.width / 2) * k, section.stage.height * k)} className="fill-stage" />
      {section.seats.map((s) => (
        <circle key={s.id} cx={s.cx * k} cy={s.cy * k} r={Math.max(0.9, SEAT_R * k)} className={s.taken ? "fill-border" : "fill-indigo-300"} />
      ))}
      <rect {...rect} rx={2} className="fill-primary/10 stroke-primary" strokeWidth={1.25} />
    </svg>
  );
}

export function SeatMap({ tier, section, currency, selectedSeatIds, atLimit, onToggle, framing = "overview", className }: SeatMapProps) {
  const selected = useMemo(() => new Set(selectedSeatIds), [selectedSeatIds]);
  const rows = useMemo(() => section.rows.map((r) => section.seats.filter((s) => s.row === r.label)), [section]);
  const [focusedId, setFocusedId] = useState(() => section.seats.find((s) => !s.taken)?.id ?? section.seats[0]?.id);
  const [tip, setTip] = useState<Tip | null>(null);
  const [view, setView] = useState<View | null>(null);
  const seatRefs = useRef(new Map<string, SVGGElement>());
  const frameRef = useRef<HTMLDivElement>(null);
  // A drag that pans the map must not toggle the seat under the pointer.
  const panned = useRef(false);

  const price = formatPrice(tier.price, currency);
  const selectedCount = selectedSeatIds.length;

  const showTip = (seat: Seat, el: Element) => {
    const frame = frameRef.current?.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    if (!frame) return;
    setTip({ seat, x: box.left + box.width / 2 - frame.left, y: box.top - frame.top });
  };

  const move = (seat: Seat, key: Direction) => {
    const r = rows.findIndex((row) => row[0]?.row === seat.row);
    const c = rows[r].findIndex((s) => s.id === seat.id);
    const [nr, nc] = { ArrowLeft: [r, c - 1], ArrowRight: [r, c + 1], ArrowUp: [r - 1, c], ArrowDown: [r + 1, c] }[key];
    const target = rows[nr]?.[Math.min(nc, (rows[nr]?.length ?? 1) - 1)];
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

  // The minimap only helps once the section no longer fits in the frame.
  const zoomedIn = view !== null && view.scale > Math.min(view.width / section.width, view.height / section.height) * 1.15;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <TransformWrapper
        minScale={0.3}
        maxScale={4}
        fitOnInit={framing === "overview" ? "contain" : undefined}
        initialScale={framing === "touch" ? TOUCH_SCALE : undefined}
        centerOnInit
        doubleClick={{ disabled: true }}
        onTransform={(ref, state) =>
          setView({
            scale: state.scale,
            x: state.positionX,
            y: state.positionY,
            width: ref.instance.wrapperComponent?.clientWidth ?? 0,
            height: ref.instance.wrapperComponent?.clientHeight ?? 0,
          })
        }
        onPanningStart={() => {
          panned.current = false;
        }}
        onPanning={() => {
          panned.current = true;
          setTip(null);
        }}
        onZoomStart={() => setTip(null)}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <div ref={frameRef} className="relative flex min-h-[340px] grow flex-col overflow-hidden rounded-2xl border border-border bg-surface lg:min-h-[420px]">
            <TransformComponent wrapperClass="size-full! grow cursor-grab active:cursor-grabbing">
              <svg
                width={section.width}
                height={section.height}
                viewBox={`0 0 ${section.width} ${section.height}`}
                role="group"
                aria-label={`Butacas de ${tier.name}`}
                className="touch-none select-none"
              >
                <Stage stage={section.stage} />
                {section.rows.map((row) => (
                  <g key={row.label} className="fill-muted-foreground text-[11px] font-semibold" aria-hidden>
                    <text x={row.start.x} y={row.start.y} dominantBaseline="central" textAnchor="middle">
                      {row.label}
                    </text>
                    <text x={row.end.x} y={row.end.y} dominantBaseline="central" textAnchor="middle">
                      {row.label}
                    </text>
                  </g>
                ))}
                {section.seats.map((seat) => {
                  const isSelected = selected.has(seat.id);
                  const blocked = !seat.taken && atLimit && !isSelected;
                  const disabled = seat.taken || blocked;
                  const status = seat.taken ? "ocupado" : isSelected ? "elegido" : blocked ? "límite alcanzado" : price;
                  const { cx, cy } = seat;
                  return (
                    <g
                      key={seat.id}
                      ref={(el) => {
                        if (el) seatRefs.current.set(seat.id, el);
                        else seatRefs.current.delete(seat.id);
                      }}
                      role="checkbox"
                      aria-checked={isSelected}
                      aria-disabled={disabled}
                      aria-label={`${tier.name}, fila ${seat.row}, asiento ${seat.number}, ${status}`}
                      tabIndex={seat.id === focusedId ? 0 : -1}
                      onFocus={(e) => {
                        setFocusedId(seat.id);
                        if (e.currentTarget.matches(":focus-visible")) showTip(seat, e.currentTarget);
                      }}
                      onBlur={() => setTip(null)}
                      onPointerEnter={(e) => e.pointerType === "mouse" && showTip(seat, e.currentTarget)}
                      onPointerLeave={() => setTip(null)}
                      onKeyDown={onKeyDown(seat)}
                      onClick={() => {
                        if (!panned.current) onToggle(seat);
                      }}
                      className={cn(
                        "group outline-none",
                        seat.taken || blocked ? "cursor-not-allowed" : "cursor-pointer",
                        blocked && "opacity-35",
                      )}
                    >
                      {/* Focus ring */}
                      <circle cx={cx} cy={cy} r={SEAT_R + 3.5} className="fill-none stroke-ring stroke-[2.5] opacity-0 group-focus-visible:opacity-100" />
                      <circle
                        cx={cx}
                        cy={cy}
                        r={SEAT_R}
                        fill={seat.taken ? TAKEN_FILL : isSelected ? SELECTED_FILL : tier.color}
                        className={cn(!disabled && !isSelected && "stroke-strong/0 stroke-2 transition-[stroke] group-hover:stroke-strong")}
                      />
                      {seat.taken && (
                        <path d={`M ${cx - 3.5} ${cy - 3.5} L ${cx + 3.5} ${cy + 3.5} M ${cx + 3.5} ${cy - 3.5} L ${cx - 3.5} ${cy + 3.5}`} stroke={TAKEN_MARK} strokeWidth={1.6} strokeLinecap="round" />
                      )}
                      {isSelected && (
                        <path d={`M ${cx - 4.5} ${cy + 0.2} L ${cx - 1.3} ${cy + 3.4} L ${cx + 4.8} ${cy - 3.2}`} fill="none" stroke="white" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                      )}
                    </g>
                  );
                })}
              </svg>
            </TransformComponent>

            {zoomedIn && <MiniMap section={section} view={view} />}

            {tip && (
              <div
                role="tooltip"
                className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-xl bg-strong px-3 py-2 text-xs whitespace-nowrap text-white shadow-lg"
                style={{ left: tip.x, top: tip.y - 8 }}
              >
                <span className="block font-semibold">
                  {tier.name} · {seatLabel(tip.seat)}
                </span>
                <span className="text-white/75">{tip.seat.taken ? "Ocupada" : selected.has(tip.seat.id) ? `Elegida · ${price}` : price}</span>
              </div>
            )}

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

      <ul aria-label="Leyenda" className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span className="size-3.5 rounded-full" style={{ background: tier.color }} aria-hidden />
          Disponible · {price}
        </li>
        <li className="flex items-center gap-1.5">
          <span className="flex size-3.5 items-center justify-center rounded-full" style={{ background: SELECTED_FILL }} aria-hidden>
            <svg viewBox="0 0 10 10" className="size-2.5">
              <path d="M2 5.2 L4.2 7.3 L8 3" fill="none" stroke="white" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          Elegida
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3.5 rounded-full" style={{ background: TAKEN_FILL }} aria-hidden />
          Ocupada
        </li>
        <li className="ml-auto hidden text-xs sm:block" aria-live="polite">
          {atLimit ? "Llegaste al máximo de esta zona" : selectedCount ? `${selectedCount} elegida${selectedCount > 1 ? "s" : ""}` : "Arrastra para moverte · + / − para acercar"}
        </li>
      </ul>
    </div>
  );
}
