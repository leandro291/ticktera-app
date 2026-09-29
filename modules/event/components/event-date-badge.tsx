import { cn } from "@/lib/utils";
import { getDateBadge } from "../lib/format";

export function EventDateBadge({ date, className }: { date: string; className?: string }) {
  const { day, month } = getDateBadge(date);
  return (
    <span
      className={cn(
        "flex w-11 flex-col items-center rounded-[11px] bg-white pt-1 pb-[5px] lg:w-14 lg:rounded-[14px] lg:pt-1.5 lg:pb-[7px] lg:shadow-[0_4px_14px_-6px_rgba(0,0,0,.35)]",
        className,
      )}
    >
      <span className="text-[10px] font-bold tracking-[0.08em] text-primary lg:text-[11px]">{month}</span>
      <span className="text-[17px] leading-[1.05] font-bold text-foreground lg:text-[22px]">{day}</span>
    </span>
  );
}
