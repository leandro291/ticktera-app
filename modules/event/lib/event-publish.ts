export type PublishIssueCode =
  | "title-required"
  | "category-required"
  | "venue-required"
  | "city-required"
  | "starts-at-past"
  | "no-tiers"
  | "no-capacity";

export interface PublishIssue {
  field: "title" | "categoryId" | "venueName" | "city" | "date" | "tiers";
  code: PublishIssueCode;
}

/** D4: devuelve todos los problemas a la vez. `checkDate: false` al editar un published cuya fecha no cambió. */
export function checkPublishable(
  c: { title: string; categoryId: string | null; venueName: string; city: string; startsAt: Date; tiers: { capacity: number }[] },
  now: Date,
  opts: { checkDate: boolean },
): PublishIssue[] {
  const issues: PublishIssue[] = [];
  if (!c.title.trim()) issues.push({ field: "title", code: "title-required" });
  if (!c.categoryId) issues.push({ field: "categoryId", code: "category-required" });
  if (!c.venueName.trim()) issues.push({ field: "venueName", code: "venue-required" });
  if (!c.city.trim()) issues.push({ field: "city", code: "city-required" });
  // "Futuro" = estrictamente después de ahora; una fecha inválida (NaN) tampoco pasa.
  if (opts.checkDate && !(c.startsAt.getTime() > now.getTime())) issues.push({ field: "date", code: "starts-at-past" });
  if (c.tiers.length === 0) issues.push({ field: "tiers", code: "no-tiers" });
  else if (c.tiers.reduce((sum, t) => sum + t.capacity, 0) < 1) issues.push({ field: "tiers", code: "no-capacity" });
  return issues;
}

export const PUBLISH_MESSAGES: Record<PublishIssueCode, string> = {
  "title-required": "Agrega un título.",
  "category-required": "Elige una categoría.",
  "venue-required": "Indica el lugar.",
  "city-required": "Indica la ciudad.",
  "starts-at-past": "La fecha y hora tienen que ser futuras.",
  "no-tiers": "Agrega al menos un tipo de entrada.",
  "no-capacity": "La capacidad total tiene que ser de al menos 1 entrada.",
};
