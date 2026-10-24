/** Mayúsculas, sin espacios, saltos de línea ni guiones (lectores USB, copiar/pegar). */
export function normalizeTicketCode(raw: string): string {
  return raw.replace(/[\s-]/g, "").toUpperCase();
}
