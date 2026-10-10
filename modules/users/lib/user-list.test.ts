import { describe, expect, it } from "vitest";
import type { UserListItem } from "../types/user-list-item";
import {
  EMPTY_FILTERS,
  filterUsers,
  getLockReason,
  hasActiveFilters,
  initials,
  paginate,
  pageWindow,
} from "./user-list";

const make = (over: Partial<UserListItem>): UserListItem => ({
  id: "1",
  email: "a@x.com",
  fullName: "Ana",
  role: "customer",
  status: "active",
  createdAt: new Date("2026-01-01"),
  ...over,
});

const users = [
  make({ id: "1", fullName: "Lucía Pérez", email: "lucia@x.com" }),
  make({ id: "2", fullName: "Bruno", email: "bruno@mail.com", role: "organizer" }),
  make({ id: "3", fullName: "Carla", email: "carla@x.com", role: "organizer", status: "suspended" }),
  make({ id: "4", fullName: "Dora", email: "dora@x.com", role: "customer", status: "suspended" }),
];

describe("filterUsers", () => {
  it("AC2: EMPTY_FILTERS devuelve todos", () => {
    expect(filterUsers(users, EMPTY_FILTERS)).toHaveLength(4);
  });
  it("AC2: busca por nombre sin mayúsculas ni acentos", () => {
    expect(filterUsers(users, { ...EMPTY_FILTERS, q: "LUCIA" }).map((u) => u.id)).toEqual(["1"]);
    expect(filterUsers(users, { ...EMPTY_FILTERS, q: "perez" }).map((u) => u.id)).toEqual(["1"]);
  });
  it("AC2: busca por correo", () => {
    expect(filterUsers(users, { ...EMPTY_FILTERS, q: "MAIL.com" }).map((u) => u.id)).toEqual(["2"]);
  });
  it("AC2: filtra por rol", () => {
    expect(filterUsers(users, { ...EMPTY_FILTERS, role: "organizer" })).toHaveLength(2);
  });
  it("AC2: el estado deja pasar solo organizadores", () => {
    const r = filterUsers(users, { ...EMPTY_FILTERS, status: "suspended" });
    expect(r.map((u) => u.id)).toEqual(["3"]);
  });
  it("AC2: combina búsqueda, rol y estado", () => {
    expect(
      filterUsers(users, { q: "carla", role: "organizer", status: "suspended" }).map((u) => u.id),
    ).toEqual(["3"]);
    expect(filterUsers(users, { q: "bruno", role: "organizer", status: "suspended" })).toEqual([]);
  });
  it("AC2: hasActiveFilters", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, q: "a" })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, role: "admin" })).toBe(true);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, status: "active" })).toBe(true);
  });
});

describe("paginate", () => {
  const rows = Array.from({ length: 24 }, (_, i) => i + 1);
  it("AC4: 24 filas x 8 -> 3 páginas, rango 1-8", () => {
    const p = paginate(rows, 1, 8);
    expect(p).toMatchObject({ page: 1, pageCount: 3, total: 24, from: 1, to: 8 });
    expect(p.items).toHaveLength(8);
  });
  it("AC4: última página parcial", () => {
    const p = paginate(rows.slice(0, 20), 3, 8);
    expect(p).toMatchObject({ page: 3, from: 17, to: 20 });
    expect(p.items).toHaveLength(4);
  });
  it("AC4: página fuera de rango se acota", () => {
    expect(paginate(rows, 99, 8).page).toBe(3);
    expect(paginate(rows, 0, 8).page).toBe(1);
  });
  it("AC3: vacío -> from = to = 0, pageCount 1", () => {
    expect(paginate([], 5, 8)).toMatchObject({ items: [], page: 1, pageCount: 1, total: 0, from: 0, to: 0 });
  });
  it("AC4: pageSize 4", () => {
    expect(paginate(rows, 2, 4)).toMatchObject({ pageCount: 6, from: 5, to: 8 });
  });
});

describe("pageWindow", () => {
  it("AC4: 3 páginas", () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
  });
  it("AC4: 10 páginas, ventana de 5", () => {
    expect(pageWindow(1, 10)).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow(5, 10)).toEqual([3, 4, 5, 6, 7]);
    expect(pageWindow(10, 10)).toEqual([6, 7, 8, 9, 10]);
  });
});

describe("initials", () => {
  it("AC1: dos palabras", () => {
    expect(initials("Carla Rojas")).toBe("CR");
  });
  it("AC1: una palabra", () => {
    expect(initials("Ana")).toBe("AN");
  });
  it("AC1: espacios extra y minúsculas", () => {
    expect(initials("  carla   rojas  gómez ")).toBe("CR");
  });
});

describe("getLockReason", () => {
  it("AC6: la propia cuenta", () => {
    expect(getLockReason({ id: "1", role: "admin" }, "1")).toBe("Tu cuenta");
  });
  it("AC6: super_admin ajeno", () => {
    expect(getLockReason({ id: "2", role: "super_admin" }, "1")).toBe("Cuenta protegida");
  });
  it("AC6: self que además es super_admin gana 'Tu cuenta'", () => {
    expect(getLockReason({ id: "1", role: "super_admin" }, "1")).toBe("Tu cuenta");
  });
  it("AC6: otro usuario -> null", () => {
    expect(getLockReason({ id: "2", role: "organizer" }, "1")).toBeNull();
  });
});
