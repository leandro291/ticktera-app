const FOREIGN_KEY_VIOLATION = "23503"

// DrizzleQueryError envuelve el error de pg en `cause`: se recorre la cadena.
export function isForeignKeyViolation(error: unknown): boolean {
  const seen = new Set<unknown>()
  let current = error
  while (typeof current === "object" && current !== null && !seen.has(current)) {
    seen.add(current)
    if ((current as { code?: unknown }).code === FOREIGN_KEY_VIOLATION) return true
    current = (current as { cause?: unknown }).cause
  }
  return false
}
