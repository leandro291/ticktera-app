import Link from "next/link";
import { TicketIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Brand link to the home page. `caption` adds a small line under the name (e.g. "Organizadores"). */
export function Logo({ className, caption }: { className?: string; caption?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 text-foreground lg:gap-2.5", className)}>
      <span className="flex size-8 items-center justify-center rounded-[10px] bg-primary text-primary-foreground lg:size-[38px] lg:rounded-[11px]">
        <TicketIcon className="size-[18px] lg:size-5" aria-hidden />
      </span>
      {caption ? (
        <span className="flex flex-col leading-[1.1]">
          <span className="text-[17px] font-bold tracking-tight lg:text-[19px]">Ticketera</span>
          <span className="text-[11px] font-medium text-muted-foreground lg:text-xs">{caption}</span>
        </span>
      ) : (
        <span className="text-lg font-bold tracking-tight lg:text-[21px]">Ticketera</span>
      )}
    </Link>
  );
}
