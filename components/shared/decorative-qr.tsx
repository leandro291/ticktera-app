import { cn } from "@/lib/utils";

const SIZE = 21;
const FINDERS = [
  [0, 0],
  [0, SIZE - 7],
  [SIZE - 7, 0],
];

/** QR-looking pattern (21×21 with the three finder marks). Decorative only: it encodes nothing. */
function qrCells(seed: string): boolean[] {
  let x = [...seed].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 233280, 7);
  const random = () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
  const cells: boolean[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const finder = FINDERS.find(([fr, fc]) => r - fr >= -1 && r - fr <= 7 && c - fc >= -1 && c - fc <= 7);
      if (finder) {
        const dr = r - finder[0];
        const dc = c - finder[1];
        const inside = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const ring = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const core = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        cells.push(inside && (ring || core));
      } else {
        cells.push(random() > 0.52);
      }
    }
  }
  return cells;
}

export function DecorativeQr({ seed, className }: { seed: string; className?: string }) {
  const cells = qrCells(seed);
  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} shapeRendering="crispEdges" aria-hidden className={cn("bg-white", className)}>
      {cells.map((on, i) => (on ? <rect key={i} x={i % SIZE} y={Math.floor(i / SIZE)} width={1} height={1} className="fill-strong" /> : null))}
    </svg>
  );
}
