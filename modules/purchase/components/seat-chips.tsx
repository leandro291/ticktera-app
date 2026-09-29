"use client";

import { useState } from "react";
import { MinusIcon, PlusIcon, SparklesIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_TICKETS_PER_ZONE } from "../data/venues";
import { pickBestSeats } from "../lib/best-seats";
import type { Seat, SeatSection } from "../types/venue";

/** Selected seats as removable chips ("Fila D · 8 ×"). */
export function SeatChips({ seats, onRemove, className }: { seats: Seat[]; onRemove: (seat: Seat) => void; className?: string }) {
  if (!seats.length) {
    return <p className={cn("text-[13px] text-muted-foreground", className)}>Toca las butacas libres para elegirlas.</p>;
  }
  return (
    <ul aria-label="Butacas elegidas" className={cn("flex flex-wrap gap-2", className)}>
      {seats.map((seat) => (
        <li key={seat.id}>
          <span className="flex h-9 items-center gap-1 rounded-full bg-strong pr-1 pl-3 text-[13px] font-semibold text-white">
            Fila {seat.row} · {seat.number}
            <button
              type="button"
              aria-label={`Quitar fila ${seat.row}, asiento ${seat.number}`}
              onClick={() => onRemove(seat)}
              className="flex size-7 items-center justify-center rounded-full hover:bg-white/15"
            >
              <XIcon className="size-3.5" aria-hidden />
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}

interface BestSeatsPickerProps {
  section: SeatSection;
  selectedSeatIds: string[];
  onPick: (seatIds: string[]) => void;
  className?: string;
}

/** "Mejores disponibles": choose how many and let the app pick adjacent seats, front and centre first. */
export function BestSeatsPicker({ section, selectedSeatIds, onPick, className }: BestSeatsPickerProps) {
  const [count, setCount] = useState(() => Math.max(2, Math.min(selectedSeatIds.length, MAX_TICKETS_PER_ZONE)));
  const [notice, setNotice] = useState<string | null>(null);
  const free = section.seats.filter((s) => !s.taken).length;

  const pick = () => {
    const result = pickBestSeats(section, count, selectedSeatIds);
    onPick(result.seatIds);
    setNotice(
      !result.seatIds.length
        ? "No quedan butacas libres en esta zona."
        : result.seatIds.length < count
          ? `Solo quedaban ${result.seatIds.length} butacas libres.`
          : result.contiguous
            ? null
            : "No había butacas juntas: elegimos las más cercanas entre sí.",
    );
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        <span className="flex shrink-0 items-center gap-0.5 rounded-xl border border-border bg-background p-[3px]">
          <button type="button" aria-label="Menos butacas" disabled={count <= 1} onClick={() => setCount((c) => c - 1)} className="flex size-9 items-center justify-center rounded-[9px] hover:bg-muted disabled:opacity-40">
            <MinusIcon className="size-4" aria-hidden />
          </button>
          <span aria-live="polite" className="w-6 text-center text-sm font-semibold tabular-nums">
            {count}
          </span>
          <button
            type="button"
            aria-label="Más butacas"
            disabled={count >= MAX_TICKETS_PER_ZONE}
            onClick={() => setCount((c) => c + 1)}
            className="flex size-9 items-center justify-center rounded-[9px] hover:bg-muted disabled:opacity-40"
          >
            <PlusIcon className="size-4" aria-hidden />
          </button>
        </span>
        <button
          type="button"
          onClick={pick}
          disabled={free === 0}
          className="flex h-11 grow items-center justify-center gap-2 rounded-xl border-[1.5px] border-strong px-3 text-sm font-semibold whitespace-nowrap hover:bg-muted disabled:opacity-40 lg:grow-0 lg:px-4"
        >
          <SparklesIcon className="size-4" aria-hidden />
          Mejores disponibles
        </button>
      </div>
      {notice && (
        <p role="status" className="text-[13px] font-medium text-warning-foreground">
          {notice}
        </p>
      )}
    </div>
  );
}
