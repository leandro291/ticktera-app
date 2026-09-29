"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { CalendarIcon, ChartColumnIcon, LayoutDashboardIcon, LogOutIcon, MenuIcon, SettingsIcon, UserIcon } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/modules/auth";

interface PanelLink {
  label: string;
  icon: LucideIcon;
  /** Missing on sections that don't exist yet (shown disabled). */
  href?: string;
  isActive?: (pathname: string) => boolean;
}

const PANEL_LINKS: PanelLink[] = [
  { label: "Resumen", icon: LayoutDashboardIcon, href: "/organizer", isActive: (p) => p === "/organizer" },
  { label: "Mis eventos", icon: CalendarIcon, href: "/organizer#my-events", isActive: (p) => p.startsWith("/organizer/events") },
  { label: "Ventas", icon: ChartColumnIcon },
  { label: "Configuración", icon: SettingsIcon },
];

const item = "flex h-11 items-center gap-3 rounded-xl px-3 text-[15px]";

/** Panel navigation; `inDrawer` closes the mobile drawer when a link is followed. */
function PanelNav({ inDrawer }: { inDrawer?: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Panel" className="flex flex-col gap-1">
      {PANEL_LINKS.map(({ label, icon: Icon, href, isActive }) => {
        const icon = <Icon className="size-[19px] shrink-0" aria-hidden />;
        if (!href) {
          return (
            <span key={label} aria-disabled="true" className={cn(item, "font-medium text-muted-foreground")}>
              {icon}
              {label}
              <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">Pronto</span>
            </span>
          );
        }
        const active = isActive?.(pathname) ?? false;
        const className = cn(
          item,
          active ? "bg-accent font-semibold text-accent-foreground hover:text-accent-foreground" : "font-medium text-zinc-700 hover:bg-muted hover:text-foreground",
        );
        const content = (
          <>
            {icon}
            {label}
          </>
        );
        return inDrawer ? (
          <SheetClose key={label} render={<Link href={href} />} nativeButton={false} aria-current={active ? "page" : undefined} className={className}>
            {content}
          </SheetClose>
        ) : (
          <Link key={label} href={href} aria-current={active ? "page" : undefined} className={className}>
            {content}
          </Link>
        );
      })}
    </nav>
  );
}

/** Organizer name + sign out (leaves the panel when there is no session). */
function PanelAccount() {
  const user = useSessionStore((s) => s.user);
  const signOut = useSessionStore((s) => s.signOut);
  const router = useRouter();

  return (
    <div className="flex items-center gap-3 border-t border-divider p-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
        <UserIcon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 grow truncate text-sm font-semibold">{user?.name ?? "Organizador demo"}</span>
      <button
        type="button"
        aria-label={user ? "Cerrar sesión" : "Salir del panel"}
        onClick={() => {
          signOut();
          router.push("/");
        }}
        className="flex size-10 shrink-0 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <LogOutIcon className="size-[18px]" aria-hidden />
      </button>
    </div>
  );
}

/** Organizer layout: fixed sidebar from `lg`, top bar + drawer on mobile. */
export function OrganizerShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-canvas lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-7 border-r border-border bg-background px-4 py-6 lg:flex">
        <Logo caption="Organizadores" className="px-2" />
        <PanelNav />
        <div className="grow" />
        <PanelAccount />
      </aside>

      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-divider bg-background pr-3 pl-4 lg:hidden">
        <Logo caption="Organizadores" />
        <Sheet>
          <SheetTrigger
            aria-label="Abrir menú del panel"
            className="flex size-11 items-center justify-center rounded-xl text-foreground hover:bg-muted"
          >
            <MenuIcon className="size-[22px]" aria-hidden />
          </SheetTrigger>
          <SheetContent side="right" className="w-[85%] gap-0 bg-background p-0">
            <SheetHeader className="h-16 justify-center border-b border-divider px-4">
              <SheetTitle className="text-lg font-semibold">Panel</SheetTitle>
            </SheetHeader>
            <div className="flex grow flex-col p-2">
              <PanelNav inDrawer />
              <div className="grow" />
              <PanelAccount />
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
