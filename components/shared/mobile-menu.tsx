"use client";

import Link from "next/link";
import { MenuIcon } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SITE_NAV } from "./site-nav";

const MENU_LINKS = [...SITE_NAV, { href: "/my-tickets", label: "Mis entradas" }, { href: "/organizer", label: "Vender entradas" }];

export function MobileMenu() {
  return (
    <Sheet>
      <SheetTrigger
        aria-label="Abrir menú"
        className="flex size-11 items-center justify-center rounded-xl text-foreground hover:bg-muted"
      >
        <MenuIcon className="size-[22px]" aria-hidden />
      </SheetTrigger>
      <SheetContent side="right" className="w-[85%] gap-0 bg-background p-0">
        <SheetHeader className="h-16 justify-center border-b border-divider px-4">
          <SheetTitle className="text-lg font-semibold">Menú</SheetTitle>
        </SheetHeader>
        <nav aria-label="Menú" className="flex flex-col p-2">
          {MENU_LINKS.map((link) => (
            <SheetClose
              key={link.href}
              render={<Link href={link.href} />}
              nativeButton={false}
              className="flex h-12 items-center rounded-xl px-3 text-base font-medium text-foreground hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </SheetClose>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
