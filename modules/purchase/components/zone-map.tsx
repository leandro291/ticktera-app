"use client";

import { formatPrice, type Currency } from "@/modules/event";
import { cn } from "@/lib/utils";
import { halfMoonPath, MAP_WIDTH, mapCenter, mapHeight, polar, sectorCentroid, sectorPath } from "../lib/venue-geometry";
import type { VenueLayout, ZoneTier } from "../types/venue";

interface ZoneMapProps {
  layout: VenueLayout;
  tiers: ZoneTier[];
  currency: Currency;
  /** Zone highlighted from the zone cards (hover / focus). */
  highlightedZoneId: string | null;
  onHighlight: (zoneId: string | null) => void;
  onSelect: (zoneId: string) => void;
  quantityOf: (zoneId: string) => number;
}

const SOLD_OUT_FILL = "#e4e4e7";
const GAP_COLOR = "#fafafa";
/** Footlights along the stage's front edge. */
const LIGHT_ANGLES = [-72, -54, -36, -18, 0, 18, 36, 54, 72];

const pct = (value: number, total: number) => `${(value / total) * 100}%`;

/**
 * Venue overview: a half-moon stage with the zones wrapped around it as ring sectors, like an amphitheatre.
 * Geometry comes from the layout data, so any venue renders from JSON. Labels are HTML on top of the SVG
 * so they stay readable at phone size.
 */
export function ZoneMap({ layout, tiers, currency, highlightedZoneId, onHighlight, onSelect, quantityOf }: ZoneMapProps) {
  const height = mapHeight(
    tiers.map((t) => t.arc),
    layout.stageRadius,
  );
  const { x: cx, y: cy } = mapCenter;
  const r = layout.stageRadius;
  const highlightedTier = tiers.find((t) => t.id === highlightedZoneId && t.status !== "sold-out");
  const guideRings = [r + 70, r + 190, r + 310, r + 430];

  return (
    <div className="rounded-2xl bg-surface p-2 lg:rounded-[18px] lg:p-4">
      <div className="relative w-full" style={{ aspectRatio: `${MAP_WIDTH} / ${height}` }} onPointerLeave={() => onHighlight(null)}>
        <svg viewBox={`0 0 ${MAP_WIDTH} ${height}`} className="absolute inset-0 size-full" role="group" aria-label="Mapa de zonas">
          <defs>
            <linearGradient id="tk-stage" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1e1b4b" />
              <stop offset="100%" stopColor="#3730a3" />
            </linearGradient>
            <radialGradient id="tk-stage-glow" cx={cx} cy={cy} r={r * 2.4} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#818cf8" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
            </radialGradient>
            <pattern id="tk-sold-out" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="14" height="14" fill={SOLD_OUT_FILL} />
              <rect width="4" height="14" fill="#d4d4d8" />
            </pattern>
            <filter id="tk-lift" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#18181b" floodOpacity="0.28" />
            </filter>
          </defs>

          {/* Room: soft glow from the stage and faint rows as guides */}
          <circle cx={cx} cy={cy} r={r * 2.4} fill="url(#tk-stage-glow)" aria-hidden />
          {guideRings.map((ring) => (
            <path
              key={ring}
              d={`M ${polar(ring, -90).x} ${polar(ring, -90).y} A ${ring} ${ring} 0 0 0 ${polar(ring, 90).x} ${polar(ring, 90).y}`}
              fill="none"
              stroke="#e4e4e7"
              strokeWidth={1.5}
              strokeDasharray="2 10"
              strokeLinecap="round"
              aria-hidden
            />
          ))}

          {tiers.map((tier) => {
            const soldOut = tier.status === "sold-out";
            const dimmed = highlightedTier !== undefined && highlightedTier.id !== tier.id;
            const price = soldOut ? "agotado" : formatPrice(tier.price, currency);
            return (
              <path
                key={tier.id}
                d={sectorPath(tier.arc)}
                role="button"
                tabIndex={soldOut ? -1 : 0}
                aria-disabled={soldOut}
                aria-label={`${tier.name}, ${price}${tier.kind === "numbered" ? ", asientos numerados" : ""}`}
                fill={soldOut ? "url(#tk-sold-out)" : tier.color}
                stroke={GAP_COLOR}
                strokeWidth={8}
                strokeLinejoin="round"
                onClick={() => !soldOut && onSelect(tier.id)}
                onKeyDown={(e) => {
                  if (!soldOut && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onSelect(tier.id);
                  }
                }}
                onPointerEnter={() => onHighlight(tier.id)}
                onFocus={() => onHighlight(tier.id)}
                onBlur={() => onHighlight(null)}
                className={cn("outline-none transition-opacity duration-150", soldOut ? "cursor-not-allowed" : "cursor-pointer", dimmed && "opacity-55")}
              />
            );
          })}

          {/* Highlighted zone drawn again on top, lifted with a dark outline */}
          {highlightedTier && (
            <path
              d={sectorPath(highlightedTier.arc)}
              fill={highlightedTier.color}
              stroke="#18181b"
              strokeWidth={5}
              strokeLinejoin="round"
              filter="url(#tk-lift)"
              pointerEvents="none"
              aria-hidden
            />
          )}

          {/* Half-moon stage with footlights */}
          <g aria-hidden>
            <path d={halfMoonPath(cx, cy - 2, r + 6)} fill="#c7d2fe" opacity={0.5} />
            <path d={halfMoonPath(cx, cy, r)} fill="url(#tk-stage)" />
            <path d={`M ${cx - r + 14} ${cy} A ${r - 14} ${r - 14} 0 0 0 ${cx + r - 14} ${cy}`} fill="none" stroke="#6366f1" strokeWidth={2} opacity={0.6} />
            {LIGHT_ANGLES.map((a) => {
              const p = polar(r - 7, a);
              return <circle key={a} cx={p.x} cy={p.y} r={4} fill="#fde68a" opacity={0.9} />;
            })}
            <rect x={cx - r - 10} y={0} width={2 * r + 20} height={cy} rx={6} fill="#1e1b4b" />
          </g>
        </svg>

        {/* Labels (HTML so they keep a readable size on phones) */}
        <span
          aria-hidden
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-[9px] font-bold tracking-[0.22em] text-white sm:text-[11px] lg:text-xs"
          style={{ left: "50%", top: pct(cy + r * 0.48, height) }}
        >
          ESCENARIO
        </span>
        {tiers.map((tier) => {
          const soldOut = tier.status === "sold-out";
          const at = sectorCentroid(tier.arc);
          const chosen = quantityOf(tier.id);
          return (
            <span
              key={tier.id}
              aria-hidden
              className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center leading-tight"
              style={{ left: pct(at.x, MAP_WIDTH), top: pct(at.y, height), color: soldOut ? "#52525b" : tier.textColor }}
            >
              <span className="text-[10px] font-semibold whitespace-nowrap sm:text-xs lg:text-sm">
                <span className="lg:hidden">{tier.shortName}</span>
                <span className="hidden lg:inline">{tier.name}</span>
              </span>
              <span className="text-[10px] whitespace-nowrap opacity-90 sm:text-[11px] lg:text-[13px]">{soldOut ? "Agotado" : formatPrice(tier.price, currency)}</span>
              {chosen > 0 && (
                <span className="mt-0.5 rounded-full bg-strong px-1.5 text-[9px] font-semibold text-white lg:mt-1 lg:px-2 lg:text-[11px]">✓ {chosen}</span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
