import type { User } from "@clerk/nextjs/server";

import { ROLES, type Role } from "./permissions";

export interface ClerkProfile {
  clerkUserId: string;
  email: string;
  fullName: string;
  metadataRole: Role | null;
}

/** Subconjunto de `UserJSON` (payload snake_case del webhook) que usamos. */
export interface WebhookUserData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  primary_email_address_id: string | null;
  email_addresses: {
    id: string;
    email_address: string;
    verification: { status: string } | null;
  }[];
  public_metadata?: Record<string, unknown> | null;
}

function toMetadataRole(value: unknown): Role | null {
  return ROLES.find((r) => r === value) ?? null;
}

function buildProfile(
  clerkUserId: string,
  rawEmail: string,
  firstName: string | null,
  lastName: string | null,
  metadataRole: unknown,
): ClerkProfile {
  const email = rawEmail.toLowerCase();
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ").trim() || email.split("@")[0];
  return { clerkUserId, email, fullName, metadataRole: toMetadataRole(metadataRole) };
}

export function profileFromWebhook(data: WebhookUserData): ClerkProfile | null {
  const primary = data.email_addresses.find((e) => e.id === data.primary_email_address_id);
  if (primary?.verification?.status !== "verified") return null;
  return buildProfile(
    data.id,
    primary.email_address,
    data.first_name,
    data.last_name,
    data.public_metadata?.role,
  );
}

export function profileFromClerkUser(user: User): ClerkProfile | null {
  const primary = user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId);
  if (primary?.verification?.status !== "verified") return null;
  return buildProfile(
    user.id,
    primary.emailAddress,
    user.firstName,
    user.lastName,
    user.publicMetadata?.role,
  );
}

/**
 * super_admin si el email coincide; si no, conserva el rol actual (nunca degrada). El email ya viene verificado.
 * Fila nueva: toma el rol de una invitación (publicMetadata, solo lo escribe el backend) si es admin u organizer.
 */
export function resolveRole(p: {
  current: Role | null;
  email: string;
  superAdminEmail?: string;
  invitedRole?: Role | null;
}): Role {
  if (p.superAdminEmail && p.email.toLowerCase() === p.superAdminEmail.toLowerCase()) {
    return "super_admin";
  }
  if (p.current) return p.current;
  return p.invitedRole === "admin" || p.invitedRole === "organizer" ? p.invitedRole : "customer";
}

export function needsRoleMirror(dbRole: Role, metadataRole: Role | null): boolean {
  return dbRole !== metadataRole;
}
