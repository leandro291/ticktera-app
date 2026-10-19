import type { z } from "zod";
import type { TierInput } from "../types/event-write";
import { FREEZE_MESSAGES, type FreezeIssue, type FreezeIssueCode } from "./event-freeze";
import { PUBLISH_MESSAGES, type PublishIssue } from "./event-publish";

// Clave = ruta del campo en el formulario ("title", "tiers.1.priceCents"); gana el primer mensaje de cada ruta.
type FieldErrors = Record<string, string>;

const add = (errors: FieldErrors, path: string, message: string) => {
  if (!(path in errors)) errors[path] = message;
};

export function zodErrorToFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) add(errors, issue.path.join("."), issue.message);
  return errors;
}

export function publishIssuesToFieldErrors(issues: PublishIssue[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) add(errors, issue.field, PUBLISH_MESSAGES[issue.code]);
  return errors;
}

const TIER_FIELD: Partial<Record<FreezeIssueCode, keyof TierInput>> = {
  "tier-price-locked": "priceCents",
  "tier-name-locked": "name",
  "tier-capacity-below-committed": "capacity",
};

/** tierId → posición en el payload; un tipo quitado no está en el payload y cae en "tiers"; lugar/fecha → "date". */
export function freezeIssuesToFieldErrors(issues: FreezeIssue[], tiers: TierInput[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const message = FREEZE_MESSAGES[issue.code](issue);
    if (issue.code === "buyer-impact-unacknowledged") {
      add(errors, "date", message);
      continue;
    }
    // El repetido se marca en su última aparición (la primera es la válida).
    const index = issue.tierId === undefined ? -1 : tiers.map((t) => t.id).lastIndexOf(issue.tierId);
    if (index === -1) {
      add(errors, "tiers", message);
      continue;
    }
    const field = TIER_FIELD[issue.code];
    add(errors, field ? `tiers.${index}.${field}` : `tiers.${index}`, message);
  }
  return errors;
}
