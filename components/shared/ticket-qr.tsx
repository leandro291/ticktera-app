import { qrMatrix } from "@/lib/qr";
import { cn } from "@/lib/utils";

const QUIET_ZONE = 4;

/** Real QR of `value` (the ticket code, nothing else). Fixed white background so it stays scannable in dark mode. Size it with `className` (e.g. `size-40`). */
export function TicketQr({ value, className }: { value: string; className?: string }) {
  const { size, cells } = qrMatrix(value);
  const total = size + QUIET_ZONE * 2;
  const path = cells.map((on, i) => (on ? `M${(i % size) + QUIET_ZONE} ${Math.floor(i / size) + QUIET_ZONE}h1v1h-1z` : "")).join("");
  return (
    <svg
      viewBox={`0 0 ${total} ${total}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label="Código QR de tu entrada"
      className={cn("bg-white", className)}
    >
      <path d={path} className="fill-strong" />
    </svg>
  );
}
