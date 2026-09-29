"use client";

import { useId, useMemo, useRef, useState } from "react";
import { TransformComponent, TransformWrapper, type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { MaximizeIcon, MinusIcon, PlusIcon } from "lucide-react";
import { formatPrice, type Currency } from "@/modules/event";
import { cn } from "@/lib/utils";
import { SEAT_R } from "../lib/seat-layout";
import { halfMoonPath } from "../lib/venue-geometry";
import type { Box, Point, Seat, SeatSection, ZoneTier } from "../types/venue";

interface SeatMapProps {
  tier: ZoneTier;
  section: SeatSection;
  currency: Currency;
  selectedSeatIds: string[];
  /** True when the zone reached the per-zone limit: free seats can't be added. */
  atLimit: boolean;
  onToggle: (seat: Seat) => void;
  /** Initial framing of the zone: `overview` fits all its seats; `touch` keeps seats finger-sized (phones). */
  framing?: "overview" | "touch";
  className?: string;
}

/** Smallest seat scale when framing on phones (~20px seats). */
const TOUCH_MIN_SCALE = 0.9;
const MAX_SCALE = 4;
const TAKEN_FILL = "#e4e4e7";
const TAKEN_MARK = "#a1a1aa";
const SELECTED_FILL = "#18181b";
/** Thin edge so light zone colours still read as seats. */
const SEAT_EDGE = "rgba(30,27,75,.28)";

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

/** Half-moon stage (same look as the zone map): back wall, gradient, footlights along the front edge. */
function Stage({ stage }: { stage: SeatSection["stage"] }) {
  const gradientId = `tk-seat-stage-${useId()}`;
  const { cx, cy, r } = stage;
  const lights = Array.from({ length: 11 }, (_, i) => {
    const t = ((i + 1) / 12) * Math.PI;
    return { x: cx - Math.cos(t) * (r - 12), y: cy + Math.sin(t) * (r - 12) };
  });
  return (
    <g aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="100%" stopColor="#3730a3" />
        </linearGradient>
      </defs>
      <path d={halfMoonPath(cx, cy, r + 9)} fill="#c7d2fe" opacity={0.45} />
      <path d={halfMoonPath(cx, cy, r)} fill={`url(#${gradientId})`} />
      <path d={`M ${cx - r + 26} ${cy} A ${r - 26} ${r - 26} 0 0 0 ${cx + r - 26} ${cy}`} fill="none" stroke="#6366f1" strokeWidth={2} opacity={0.55} />
      {lights.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill="#fde68a" opacity={0.9} />
      ))}
      <rect x={cx - r - 14} y={cy - 16} width={2 * r + 28} height={16} rx={6} fill="#1e1b4b" />
      <text x={cx} y={cy + r * 0.45} dominantBaseline="central" textAnchor="middle" className="fill-white text-[16px] font-bold tracking-[0.24em]">
        ESCENARIO
      </text>
    </g>
  );
}

/** The rest of the venue, drawn faintly with its zone names, so the seats read in context. */
function VenueContext({ section, color }: { section: SeatSection; color: string }) {
  return (
    <g aria-hidden>
      {section.neighbors.map((n) => (
        <g key={n.zoneId}>
          <path d={n.path} fill="#f4f4f5" stroke="#e4e4e7" strokeWidth={2} strokeLinejoin="round" />
          <text x={n.label.x} y={n.label.y} dominantBaseline="central" textAnchor="middle" className="fill-zinc-400 text-[15px] font-semibold">
            {n.name}
          </text>
        </g>
      ))}
      <path d={section.outline} fill={color} fillOpacity={0.12} stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
    </g>
  );
}

/** Whole-venue thumbnail with the visible area, shown while zoomed in (desktop). */
function MiniMap({ section, color, view }: { section: SeatSection; color: string; view: View }) {
  const w = 150;
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
      <g transform={`scale(${k})`}>
        {section.neighbors.map((n) => (
          <path key={n.zoneId} d={n.path} fill="#e4e4e7" />
        ))}
        <path d={section.outline} fill={color} />
        <path d={halfMoonPath(section.stage.cx, section.stage.cy, section.stage.r)} className="fill-stage" />
      </g>
      <rect {...rect} rx={2} className="fill-primary/10 stroke-primary" strokeWidth={1.5} />
    </svg>
  );
}

/**
 * Transform that frames `box` in a `width`×`height` viewport. When `minScale` forces a closer view than the box
 * allows, it centres on `anchor` instead (the box centre of an arc can fall outside the zone).
 */
function frameTransform(box: Box, anchor: Point, width: number, height: number, minScale: number) {
  const fit = Math.min(width / box.width, height / box.height);
  const scale = Math.min(MAX_SCALE, Math.max(minScale, fit));
  const center = scale > fit ? anchor : { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  return { scale, x: width / 2 - center.x * scale, y: height / 2 - center.y * scale };
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
    const distance = (s: Seat) => Math.hypot(s.cx - seat.cx, s.cy - seat.cy);
    // Rows hold different seat counts (outer arcs are longer): up/down goes to the nearest seat of that row.
    const nearestIn = (row: Seat[] | undefined) => row?.reduce((a, b) => (distance(b) < distance(a) ? b : a));
    const target = { ArrowLeft: rows[r][c - 1], ArrowRight: rows[r][c + 1], ArrowUp: nearestIn(rows[r - 1]), ArrowDown: nearestIn(rows[r + 1]) }[key];
    if (!target) return;
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

  // The minimap only helps once the whole venue no longer fits in the frame.
  const zoomedIn = view !== null && view.scale > Math.min(view.width / section.width, view.height / section.height) * 1.15;
  const minFrameScale = framing === "touch" ? TOUCH_MIN_SCALE : 0.2;

  /** Frames the zone's seats (on open and with the "Encuadrar la zona" button). */
  const frameZone = (ref: ReactZoomPanPinchRef, animationTime = 0) => {
    const wrapper = ref.instance.wrapperComponent;
    if (!wrapper?.clientWidth) {
      requestAnimationFrame(() => frameZone(ref, animationTime));
      return;
    }
    const t = frameTransform(section.focus, section.anchor, wrapper.clientWidth, wrapper.clientHeight, minFrameScale);
    ref.setTransform(t.x, t.y, t.scale, animationTime);
  };

  return (
    <div className={cn("flex min-h-0 flex-col gap-3", className)}>
      <TransformWrapper
        minScale={0.15}
        maxScale={MAX_SCALE}
        limitToBounds={false}
        doubleClick={{ disabled: true }}
        onInit={(ref) => frameZone(ref)}
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
        {(ref) => (
          <div
            ref={frameRef}
            // Fixed frame: the canvas is the whole venue, so it must never size the frame (phones fill the sheet instead).
            className={cn(
              "relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface",
              framing === "touch" ? "min-h-[300px] flex-1 basis-0" : "h-[440px] lg:h-[480px]",
            )}
          >
            <TransformComponent wrapperClass="size-full! grow cursor-grab active:cursor-grabbing">
              <svg
                width={section.width}
                height={section.height}
                viewBox={`0 0 ${section.width} ${section.height}`}
                role="group"
                aria-label={`Butacas de ${tier.name}`}
                className="touch-none select-none"
              >
                <VenueContext section={section} color={tier.color} />
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
                        stroke={seat.taken || isSelected ? undefined : SEAT_EDGE}
                        className={cn(!disabled && !isSelected && "stroke-1 transition-[stroke,stroke-width] group-hover:stroke-strong group-hover:stroke-2")}
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

            {zoomedIn && <MiniMap section={section} color={tier.color} view={view} />}

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
              <button type="button" aria-label="Acercar" onClick={() => ref.zoomIn()} className={controlClass}>
                <PlusIcon className="size-[18px]" aria-hidden />
              </button>
              <button type="button" aria-label="Alejar" onClick={() => ref.zoomOut()} className={controlClass}>
                <MinusIcon className="size-[18px]" aria-hidden />
              </button>
              <button type="button" aria-label="Encuadrar la zona" onClick={() => frameZone(ref, 300)} className={controlClass}>
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
