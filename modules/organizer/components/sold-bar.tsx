/** Thin progress bar of tickets sold over capacity. */
export function SoldBar({ sold, capacity }: { sold: number; capacity: number }) {
  const pct = capacity ? Math.min(100, (sold / capacity) * 100) : 0;
  return (
    <span className="block h-1.5 overflow-hidden rounded-full bg-divider" aria-hidden>
      <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
    </span>
  );
}
