import Link from "next/link";
import { TicketIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 text-foreground lg:gap-2.5", className)}>
      <span className="flex size-8 items-center justify-center rounded-[10px] bg-primary text-primary-foreground lg:size-[38px] lg:rounded-[11px]">
        <TicketIcon className="size-[18px] lg:size-5" aria-hidden />
      </span>
      <span className="text-lg font-bold tracking-tight lg:text-[21px]">Ticketera</span>
    </Link>
  );
}
