/** Name for a user who logged in with only an email: "ana.perez@mail.com" → "Ana Perez". */
export function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

/** Up to two initials for the avatar: "Ana Pérez" → "AP". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

/** Only same-site paths are allowed as post-login redirects. */
export const safeRedirect = (target: string | undefined, fallback = "/my-tickets") =>
  target && target.startsWith("/") && !target.startsWith("//") ? target : fallback;
