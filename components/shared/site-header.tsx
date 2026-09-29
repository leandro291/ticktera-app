import Link from "next/link";
import { cn } from "@/lib/utils";
import { AccountMenu } from "@/modules/auth";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { NavLink } from "./nav-link";
import { SITE_NAV } from "./site-nav";

export function SiteHeader({ className }: { className?: string }) {
  return (
    <header className={cn("sticky top-0 z-40 border-b border-divider bg-background", className)}>
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between pr-3 pl-4 lg:h-[76px] lg:px-20">
        <Logo />
        <nav aria-label="Principal" className="hidden items-center gap-9 lg:flex">
          {SITE_NAV.map((link) => (
            <NavLink key={link.href} href={link.href} className="text-[15px] font-medium text-zinc-700 hover:text-primary">
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-1 lg:gap-2">
          <AccountMenu />
          <Link
            href="/organizer"
            className="hidden h-11 items-center rounded-xl border-[1.5px] border-input px-[18px] text-[15px] font-semibold text-foreground hover:border-foreground lg:flex"
          >
            Vender entradas
          </Link>
          <div className="lg:hidden">
            <MobileMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
