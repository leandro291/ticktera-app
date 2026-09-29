"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOutIcon, TicketIcon } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { initials } from "../lib/display-name";
import { useSessionStore } from "../store/use-session-store";

/** Header account area: sign-in link when logged out; "Mis entradas" + account panel when logged in. */
export function AccountMenu() {
  const user = useSessionStore((s) => s.user);
  const signOut = useSessionStore((s) => s.signOut);
  const pathname = usePathname();
  const router = useRouter();

  if (!user) {
    return (
      <Link
        href={`/login?redirect=${encodeURIComponent(pathname)}`}
        className="flex h-11 items-center rounded-xl px-3 text-sm font-medium text-foreground hover:bg-muted lg:px-[18px] lg:text-[15px]"
      >
        <span className="lg:hidden">Ingresar</span>
        <span className="hidden lg:inline">Iniciar sesión</span>
      </Link>
    );
  }

  const onMyTickets = pathname === "/my-tickets";

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/my-tickets"
        aria-current={onMyTickets ? "page" : undefined}
        className={cn(
          "hidden h-11 items-center gap-2 rounded-xl px-4 text-[15px] font-semibold lg:flex",
          onMyTickets ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-muted",
        )}
      >
        <TicketIcon className="size-[18px]" aria-hidden />
        Mis entradas
      </Link>
      <Sheet>
        <SheetTrigger
          aria-label="Mi cuenta"
          className="flex size-11 items-center justify-center rounded-full border-[1.5px] border-input bg-background text-sm font-semibold text-foreground hover:border-foreground"
        >
          {initials(user.name) || "?"}
        </SheetTrigger>
        <SheetContent side="right" className="w-[85%] gap-0 bg-background p-0 sm:max-w-xs">
          <SheetHeader className="gap-1 border-b border-divider p-5">
            <SheetTitle className="text-lg font-semibold">{user.name}</SheetTitle>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          </SheetHeader>
          <nav aria-label="Mi cuenta" className="flex flex-col p-2">
            <SheetClose
              render={<Link href="/my-tickets" />}
              nativeButton={false}
              className="flex h-12 items-center gap-3 rounded-xl px-3 text-base font-medium text-foreground hover:bg-muted hover:text-foreground"
            >
              <TicketIcon className="size-5" aria-hidden />
              Mis entradas
            </SheetClose>
            <SheetClose
              onClick={() => {
                signOut();
                router.push("/");
              }}
              className="flex h-12 items-center gap-3 rounded-xl px-3 text-left text-base font-medium text-foreground hover:bg-muted"
            >
              <LogOutIcon className="size-5" aria-hidden />
              Cerrar sesión
            </SheetClose>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
