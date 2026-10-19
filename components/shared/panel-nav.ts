import { can, type Permission, type Role } from "@/modules/auth"

export type PanelIconKey =
  | "dashboard"
  | "users"
  | "organizers"
  | "events"
  | "check-in"
  | "payouts"

/** Definición estática. Sin `href` = "Pronto". */
interface NavItemDef {
  id: string
  label: string
  icon: PanelIconKey
  href?: string
  match?: string // prefijo para el estado activo (obligatorio si hay href)
  exact?: boolean // solo igualdad (Eventos)
  permission?: Permission // además del de la sección
}

interface NavSectionDef {
  id: "admin" | "organizer"
  label: string
  permission: Permission
  items: readonly NavItemDef[]
}

/** Ítem resuelto para un rol. `href === null` => deshabilitado ("Pronto"); entonces `match` también es null. */
export interface NavItem {
  id: string
  label: string
  icon: PanelIconKey
  href: string | null
  match: string | null
  exact: boolean
}

export interface NavSection {
  id: "admin" | "organizer"
  label: string
  items: NavItem[]
}

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super admin",
  admin: "Administrador",
  organizer: "Organizador",
  customer: "Cliente",
}

const NAV_SECTIONS: readonly NavSectionDef[] = [
  {
    id: "admin",
    label: "Administración",
    permission: "admin:panel",
    items: [
      { id: "dashboard", label: "Dashboard", icon: "dashboard" },
      {
        id: "users",
        label: "Usuarios",
        icon: "users",
        href: "/super-admin/users",
        match: "/super-admin/users",
        permission: "users:manage-roles",
      },
      {
        id: "moderation",
        label: "Eventos",
        icon: "events",
        href: "/admin/events",
        match: "/admin/events",
        permission: "events:moderate",
      },
      { id: "organizers", label: "Organizadores", icon: "organizers" },
    ],
  },
  {
    id: "organizer",
    label: "Organizador",
    permission: "organizer:panel",
    items: [
      {
        id: "events",
        label: "Eventos",
        icon: "events",
        href: "/organizer",
        match: "/organizer", // también activo en /organizer/events/new
      },
      { id: "check-in", label: "Check-in", icon: "check-in" },
      { id: "payouts", label: "Pagos", icon: "payouts" },
    ],
  },
]

function resolveItem(role: Role, def: NavItemDef): NavItem {
  const enabled = !!def.href && (!def.permission || can(role, def.permission))
  return {
    id: def.id,
    label: def.label,
    icon: def.icon,
    href: enabled ? (def.href ?? null) : null,
    match: enabled ? (def.match ?? null) : null,
    exact: enabled && !!def.exact,
  }
}

export function getNavSections(role: Role): NavSection[] {
  return NAV_SECTIONS.filter((s) => can(role, s.permission)).map((s) => ({
    id: s.id,
    label: s.label,
    items: s.items.map((item) => resolveItem(role, item)),
  }))
}

function matches(item: NavItem, pathname: string): boolean {
  if (!item.match) return false
  if (item.exact) return pathname === item.match
  return pathname === item.match || pathname.startsWith(`${item.match}/`)
}

/** Gana el ítem habilitado con el `match` más largo (D4). */
export function getActiveNavItem(
  sections: NavSection[],
  pathname: string,
): { section: NavSection; item: NavItem } | null {
  let best: { section: NavSection; item: NavItem } | null = null
  for (const section of sections) {
    for (const item of section.items) {
      if (
        matches(item, pathname) &&
        (!best || item.match!.length > best.item.match!.length)
      ) {
        best = { section, item }
      }
    }
  }
  return best
}

export function getPanelCrumb(
  sections: NavSection[],
  pathname: string,
): { section: string | null; title: string } {
  const active = getActiveNavItem(sections, pathname)
  return active
    ? { section: active.section.label, title: active.item.label }
    : { section: null, title: "Panel" }
}
