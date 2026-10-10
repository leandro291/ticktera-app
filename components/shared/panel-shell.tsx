"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import type { LucideIcon } from "lucide-react";
import {
  Building2Icon,
  CalendarDaysIcon,
  ChevronRightIcon,
  GlobeIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  QrCodeIcon,
  UsersIcon,
  WalletIcon,
  XIcon,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { getActiveNavItem, getNavSections, getPanelCrumb, ROLE_LABEL, type NavSection, type PanelIconKey } from "@/components/shared/panel-nav";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Role } from "@/modules/auth";
import { cn } from "@/lib/utils";

/** Exhaustive: `tsc` fails if a `PanelIconKey` has no icon. */
const ICONS: Record<PanelIconKey, LucideIcon> = {
  dashboard: LayoutDashboardIcon,
  users: UsersIcon,
  organizers: Building2Icon,
  events: CalendarDaysIcon,
  "check-in": QrCodeIcon,
  payouts: WalletIcon,
};

const focusRing = "outline-none focus-visible:ring-2 focus-visible:ring-ring";
const row = cn("flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium", focusRing);
const iconBtn = cn("flex size-11 shrink-0 items-center justify-center rounded-xl text-foreground hover:bg-muted", focusRing);

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-primary", className)}
    >
      {initials(name)}
    </span>
  );
}

interface PanelNavProps {
  sections: NavSection[];
  activeId: string | null;
  collapsed: boolean;
  onNavigate?: () => void;
}

function PanelNav({ sections, activeId, collapsed, onNavigate }: PanelNavProps) {
  return (
    <nav aria-label="Menú principal" className="flex flex-col gap-4">
      {sections.map((section) => (
        <div key={section.id} role="group" aria-label={section.label} className="flex flex-col gap-1">
          {collapsed ? (
            <div aria-hidden className="mx-3 my-1 h-px bg-divider" />
          ) : (
            <p className="px-3 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{section.label}</p>
          )}
          {section.items.map(({ id, label, icon, href }) => {
            const Icon = ICONS[icon];
            const layout = collapsed ? "justify-center px-0" : "";
            const content = (
              <>
                <Icon className="size-[19px] shrink-0" aria-hidden />
                <span className={collapsed ? "sr-only" : "truncate"}>{label}</span>
              </>
            );
            if (!href) {
              return (
                <span
                  key={id}
                  aria-disabled="true"
                  title={collapsed ? `${label} · Pronto` : undefined}
                  className={cn(row, layout, "text-muted-foreground")}
                >
                  {content}
                  <span className={collapsed ? "sr-only" : "ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold"}>Pronto</span>
                </span>
              );
            }
            const active = id === activeId;
            return (
              <Link
                key={id}
                href={href}
                onClick={onNavigate}
                title={collapsed ? label : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(row, layout, active ? "bg-indigo-50 text-indigo-700" : "text-zinc-700 hover:bg-muted hover:text-foreground")}
              >
                {content}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function PanelFooter({ role, fullName, collapsed }: { role: Role; fullName: string; collapsed: boolean }) {
  const name = fullName.trim() || ROLE_LABEL[role];
  const layout = collapsed ? "justify-center px-0" : "";
  const label = (text: string) => <span className={collapsed ? "sr-only" : "truncate"}>{text}</span>;
  return (
    <div className="flex flex-col gap-1 border-t border-divider p-3">
      <Link href="/" title={collapsed ? "Ver sitio" : undefined} className={cn(row, layout, "text-zinc-700 hover:bg-muted hover:text-foreground")}>
        <GlobeIcon className="size-[19px] shrink-0" aria-hidden />
        {label("Ver sitio")}
      </Link>
      <SignOutButton redirectUrl="/">
        <button
          type="button"
          title={collapsed ? "Cerrar sesión" : undefined}
          className={cn(row, layout, "w-full text-zinc-700 hover:bg-muted hover:text-foreground")}
        >
          <LogOutIcon className="size-[19px] shrink-0" aria-hidden />
          {label("Cerrar sesión")}
        </button>
      </SignOutButton>
      <div title={collapsed ? `${name} · ${ROLE_LABEL[role]}` : undefined} className={cn("flex items-center gap-3 px-3 pt-2", layout)}>
        <Avatar name={name} />
        <span className={cn("min-w-0 flex-col leading-tight", collapsed ? "hidden" : "flex")}>
          <span className="truncate text-sm font-semibold">{name}</span>
          <span className="truncate text-xs text-muted-foreground">{ROLE_LABEL[role]}</span>
        </span>
      </div>
    </div>
  );
}

/** Unified panel layout: collapsible sidebar + top bar from `lg`, top bar + left drawer on mobile. */
export function PanelShell({ role, fullName, children }: { role: Role; fullName: string; children: React.ReactNode }) {
  const pathname = usePathname();
  // ponytail: estado local; persistir en localStorage si se pide recordar la preferencia
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sections = getNavSections(role);
  const activeId = getActiveNavItem(sections, pathname)?.item.id ?? null;
  const crumb = getPanelCrumb(sections, pathname);
  const name = fullName.trim() || ROLE_LABEL[role];

  return (
    <div className="flex min-h-dvh flex-1 bg-canvas">
      <aside
        id="panel-sidebar"
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col overflow-hidden border-r border-border bg-background transition-[width] duration-200 motion-reduce:transition-none lg:flex",
          collapsed ? "w-[76px]" : "w-[264px]",
        )}
      >
        <div className={cn("flex h-16 shrink-0 items-center border-b border-divider px-4", collapsed && "justify-center")}>
          <Logo iconOnly={collapsed} />
        </div>
        <div className="grow overflow-y-auto p-3">
          <PanelNav sections={sections} activeId={activeId} collapsed={collapsed} />
        </div>
        <PanelFooter role={role} fullName={fullName} collapsed={collapsed} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 hidden h-16 shrink-0 items-center gap-3 border-b border-divider bg-background px-4 lg:flex">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            aria-controls="panel-sidebar"
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
            className={iconBtn}
          >
            {collapsed ? <PanelLeftOpenIcon className="size-5" aria-hidden /> : <PanelLeftCloseIcon className="size-5" aria-hidden />}
          </button>
          <nav aria-label="Ruta">
            <ol className="flex items-center gap-1.5 text-sm">
              {crumb.section ? (
                <>
                  <li className="text-muted-foreground">{crumb.section}</li>
                  <li aria-hidden className="text-muted-foreground">
                    <ChevronRightIcon className="size-4" />
                  </li>
                </>
              ) : null}
              <li className="font-semibold">{crumb.title}</li>
            </ol>
          </nav>
        </header>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <header className="sticky top-0 z-40 flex h-[60px] shrink-0 items-center gap-2 border-b border-divider bg-background pr-4 pl-2 lg:hidden">
            <SheetTrigger aria-label="Abrir menú" aria-expanded={mobileOpen} className={iconBtn}>
              <MenuIcon className="size-[22px]" aria-hidden />
            </SheetTrigger>
            <span className="min-w-0 grow truncate text-base font-semibold">{crumb.title}</span>
            <Avatar name={name} className="size-9" />
          </header>
          <SheetContent side="left" showCloseButton={false} className="gap-0 bg-background p-0 data-[side=left]:w-[300px]">
            <div className="flex h-[60px] shrink-0 items-center justify-between border-b border-divider pr-2 pl-4">
              <SheetTitle className="sr-only">Menú</SheetTitle>
              <Logo />
              <SheetClose aria-label="Cerrar menú" className={iconBtn}>
                <XIcon className="size-5" aria-hidden />
              </SheetClose>
            </div>
            <div className="grow overflow-y-auto p-3">
              <PanelNav sections={sections} activeId={activeId} collapsed={false} onNavigate={() => setMobileOpen(false)} />
            </div>
            <PanelFooter role={role} fullName={fullName} collapsed={false} />
          </SheetContent>
        </Sheet>

        {children}
      </div>
    </div>
  );
}
