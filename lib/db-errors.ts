const FOREIGN_KEY_VIOLATION = "23503"
const UNIQUE_VIOLATION = "23505"

type PgErrorFields = { code?: unknown; constraint?: unknown }

// DrizzleQueryError envuelve el error de pg en `cause`: se recorre la cadena.
function findInCauseChain(error: unknown, match: (e: PgErrorFields) => boolean): PgErrorFields | undefined {
  const seen = new Set<unknown>()
  let current = error
  while (typeof current === "object" && current !== null && !seen.has(current)) {
    seen.add(current)
    if (match(current as PgErrorFields)) return current as PgErrorFields
    current = (current as { cause?: unknown }).cause
  }
  return undefined
}

export function isForeignKeyViolation(error: unknown): boolean {
  return findInCauseChain(error, (e) => e.code === FOREIGN_KEY_VIOLATION) !== undefined
}

export function isUniqueViolation(error: unknown): boolean {
  return findInCauseChain(error, (e) => e.code === UNIQUE_VIOLATION) !== undefined
}

/** Nombre de la constraint violada (pg lo expone en `constraint`), si lo hay. */
export function pgConstraint(error: unknown): string | undefined {
  const found = findInCauseChain(error, (e) => typeof e.constraint === "string")
  return found?.constraint as string | undefined
}
