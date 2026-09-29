import Link from "next/link";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { NavLink } from "./nav-link";
import { SITE_NAV } from "./site-nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-divider bg-background">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between pr-3 pl-4 lg:h-[76px] lg:px-20">
        <Logo />
        <nav aria-label="Principal" className="hidden items-center gap-9 lg:flex">
          {SITE_NAV.map((link) => (
            <NavLink key={link.href} href={link.href} className="text-[15px] font-medium text-zinc-700 hover:text-primary">
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Link href="/login" className="flex h-11 items-center rounded-xl px-[18px] text-[15px] font-medium text-foreground hover:bg-muted">
            Iniciar sesión
          </Link>
          <Link
            href="/organizer"
            className="flex h-11 items-center rounded-xl border-[1.5px] border-input px-[18px] text-[15px] font-semibold text-foreground hover:border-foreground"
          >
            Vender entradas
          </Link>
        </div>
        <div className="flex items-center gap-1 lg:hidden">
          <Link href="/login" className="flex h-11 items-center px-3 text-sm font-medium text-foreground">
            Ingresar
          </Link>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
