import { describe, expect, it } from "vitest"
import { ROLES, type Role } from "@/modules/auth"
import {
  ROLE_LABEL,
  getActiveNavItem,
  getNavSections,
  getPanelCrumb,
  type NavSection,
} from "./panel-nav"

const sectionIds = (role: Role) => getNavSections(role).map((s) => s.id)

function enabledIds(role: Role): string[] {
  return getNavSections(role)
    .flatMap((s) => s.items)
    .filter((i) => i.href !== null)
    .map((i) => i.id)
}

const activeId = (sections: NavSection[], path: string) =>
  getActiveNavItem(sections, path)?.item.id ?? null

describe("getNavSections", () => {
  it("AC1: secciones visibles por rol, Administración primero", () => {
    expect(sectionIds("customer")).toEqual([])
    expect(sectionIds("organizer")).toEqual(["organizer"])
    expect(sectionIds("admin")).toEqual(["admin", "organizer"])
    expect(sectionIds("super_admin")).toEqual(["admin", "organizer"])
  })

  it("AC2: ítems en orden por sección e ids únicos", () => {
    const sections = getNavSections("super_admin")
    expect(sections[0].items.map((i) => i.id)).toEqual([
      "dashboard",
      "users",
      "moderation",
      "organizers",
    ])
    expect(sections[1].items.map((i) => i.id)).toEqual([
      "events",
      "check-in",
      "payouts",
    ])
    const ids = sections.flatMap((s) => s.items.map((i) => i.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("AC2: habilitados por rol", () => {
    const organizerItems = ["events"]
    expect(enabledIds("customer")).toEqual([])
    expect(enabledIds("organizer")).toEqual(organizerItems)
    expect(enabledIds("admin")).toEqual(["moderation", ...organizerItems])
    expect(enabledIds("super_admin")).toEqual(["users", "moderation", ...organizerItems])
  })

  it("AC2: un ítem deshabilitado no expone href ni match", () => {
    for (const role of ROLES) {
      for (const item of getNavSections(role).flatMap((s) => s.items)) {
        if (item.href === null) {
          expect(item.match).toBeNull()
          expect(item.exact).toBe(false)
        } else {
          expect(item.match).not.toBeNull()
        }
      }
    }
    const users = getNavSections("admin")[0].items.find((i) => i.id === "users")
    expect(users).toMatchObject({ href: null, match: null })
  })
})

describe("getActiveNavItem", () => {
  const organizer = getNavSections("organizer")
  const admin = getNavSections("admin")
  const superAdmin = getNavSections("super_admin")

  it("AC3: rutas del organizador, prefijo más largo gana", () => {
    expect(activeId(organizer, "/organizer")).toBe("events")
    expect(activeId(organizer, "/organizer/events/new")).toBe("events")
  })

  it("AC3: Usuarios solo activo para super_admin", () => {
    expect(activeId(superAdmin, "/super-admin/users")).toBe("users")
    expect(activeId(admin, "/super-admin/users")).toBeNull()
  })

  it("AC27 (event-crud): Eventos de Administración activo en /admin/events para admin y super_admin", () => {
    expect(activeId(admin, "/admin/events")).toBe("moderation")
    expect(activeId(superAdmin, "/admin/events")).toBe("moderation")
    expect(activeId(organizer, "/admin/events")).toBeNull()
    expect(getNavSections("organizer").flatMap((s) => s.items).some((i) => i.id === "moderation")).toBe(false)
  })

  it("AC3: sin coincidencia devuelve null", () => {
    expect(activeId(organizer, "/organizerx")).toBeNull()
    expect(activeId(organizer, "/")).toBeNull()
    expect(activeId([], "/organizer")).toBeNull()
  })

  it("AC3: devuelve también la sección del ítem activo", () => {
    expect(getActiveNavItem(superAdmin, "/super-admin/users")?.section.id).toBe(
      "admin",
    )
  })
})

describe("getPanelCrumb", () => {
  it("AC3: con ítem activo", () => {
    expect(getPanelCrumb(getNavSections("organizer"), "/organizer")).toEqual({
      section: "Organizador",
      title: "Eventos",
    })
    expect(getPanelCrumb(getNavSections("super_admin"), "/super-admin/users")).toEqual({
      section: "Administración",
      title: "Usuarios",
    })
  })

  it("AC3: sin ítem activo", () => {
    expect(getPanelCrumb(getNavSections("organizer"), "/")).toEqual({
      section: null,
      title: "Panel",
    })
  })
})

describe("ROLE_LABEL", () => {
  it("AC4: cubre los 4 roles en español", () => {
    expect(ROLE_LABEL).toEqual({
      super_admin: "Super admin",
      admin: "Administrador",
      organizer: "Organizador",
      customer: "Cliente",
    })
  })
})
