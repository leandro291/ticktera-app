"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const current = pathname === href || (href !== "/" && !href.includes("#") && pathname.startsWith(`${href}/`));

  return (
    <Link href={href} aria-current={current ? "page" : undefined} className={cn(className, current && "text-primary")}>
      {children}
    </Link>
  );
}
