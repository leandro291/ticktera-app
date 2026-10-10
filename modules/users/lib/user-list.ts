import type { Role } from "@/modules/auth";
import type { UserListItem } from "../types/user-list-item";

export type UserListFilters = {
  q: string;
  role: Role | "all";
  status: "all" | "active" | "suspended";
};

export const EMPTY_FILTERS: UserListFilters = { q: "", role: "all", status: "all" };
export const PAGE_SIZES = [8, 16, 24] as const;
export const MOBILE_PAGE_SIZE = 4;

export function hasActiveFilters(f: UserListFilters): boolean {
  return f.q.trim() !== "" || f.role !== "all" || f.status !== "all";
}

// Minúsculas y sin diacríticos.
const normalize = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

// El estado aplica solo a organizadores (D2).
export function filterUsers(users: UserListItem[], f: UserListFilters): UserListItem[] {
  const q = normalize(f.q.trim());
  return users.filter(
    (u) =>
      (q === "" || normalize(u.fullName).includes(q) || normalize(u.email).includes(q)) &&
      (f.role === "all" || u.role === f.role) &&
      (f.status === "all" || (u.role === "organizer" && u.status === f.status)),
  );
}

export function paginate<T>(items: T[], page: number, pageSize: number) {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);
  return {
    items: slice,
    page: current,
    pageCount,
    total,
    from: total === 0 ? 0 : start + 1,
    to: total === 0 ? 0 : start + slice.length,
  };
}

export function pageWindow(page: number, pageCount: number, size = 5): number[] {
  const first = Math.max(1, Math.min(page - 2, pageCount - size + 1));
  const last = Math.min(first + size - 1, pageCount);
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const text = words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "").slice(0, 2);
  return text.toUpperCase();
}

export function getLockReason(
  user: Pick<UserListItem, "id" | "role">,
  currentUserId: string,
): "Tu cuenta" | "Cuenta protegida" | null {
  if (user.id === currentUserId) return "Tu cuenta";
  return user.role === "super_admin" ? "Cuenta protegida" : null;
}
