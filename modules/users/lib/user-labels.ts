import type { Role } from "@/modules/auth";

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super admin",
  admin: "Administrador",
  organizer: "Organizador",
  customer: "Cliente",
};

export const ORGANIZER_STATUS_LABEL: Record<"active" | "suspended", string> = {
  active: "Aprobado",
  suspended: "Suspendido",
};

export const INVITE_ROLES = ["organizer", "admin"] as const;
export const EDIT_ROLES = ["customer", "organizer", "admin"] as const;
