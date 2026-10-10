const SLUG_MAX = 60;

export const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Slug del título, ≤ 60 sin guion final; "evento" si no queda nada. */
export function slugBase(title: string): string {
  return slugify(title).slice(0, SLUG_MAX).replace(/-+$/, "") || "evento";
}

/** El base si está libre; si no, `${base}-${random()}` hasta dar con uno libre (el índice único es la última barrera). */
export function uniqueSlug(base: string, taken: ReadonlySet<string>, random: () => string): string {
  let slug = base;
  while (taken.has(slug)) slug = `${base}-${random()}`;
  return slug;
}
