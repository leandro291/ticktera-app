import { describe, expect, it } from "vitest"
import { isForeignKeyViolation, isUniqueViolation, pgConstraint } from "./db-errors"

const pgError = (code: string, constraint?: string) => Object.assign(new Error("pg"), { code, constraint })
const drizzleWrap = (cause: unknown) => new Error("Failed query", { cause })

describe("isForeignKeyViolation", () => {
  it("AC15: error plano con code 23503", () => {
    expect(isForeignKeyViolation(pgError("23503"))).toBe(true)
  })

  it("AC15: code 23503 anidado en cause (DrizzleQueryError simulado)", () => {
    expect(isForeignKeyViolation(drizzleWrap(pgError("23503")))).toBe(true)
  })

  it("AC15: otro código no es violación de FK", () => {
    expect(isForeignKeyViolation(drizzleWrap(pgError("23505")))).toBe(false)
  })

  it("AC15: valores que no son error", () => {
    expect(isForeignKeyViolation(null)).toBe(false)
    expect(isForeignKeyViolation(undefined)).toBe(false)
    expect(isForeignKeyViolation("23503")).toBe(false)
  })

  it("AC15: cause cíclico no cuelga", () => {
    const a: { cause?: unknown } = {}
    const b = { cause: a }
    a.cause = b
    expect(isForeignKeyViolation(a)).toBe(false)
  })
})

describe("isUniqueViolation", () => {
  it("AC13: code 23505 plano y anidado", () => {
    expect(isUniqueViolation(pgError("23505"))).toBe(true)
    expect(isUniqueViolation(drizzleWrap(pgError("23505")))).toBe(true)
  })

  it("AC13: otro código o no-error", () => {
    expect(isUniqueViolation(drizzleWrap(pgError("23503")))).toBe(false)
    expect(isUniqueViolation(null)).toBe(false)
  })
})

describe("pgConstraint", () => {
  it("AC13: lee la constraint en la cadena cause", () => {
    const err = drizzleWrap(pgError("23505", "ticket_types_event_id_name_unique"))
    expect(pgConstraint(err)).toBe("ticket_types_event_id_name_unique")
  })

  it("AC13: sin constraint o no-error → undefined", () => {
    expect(pgConstraint(drizzleWrap(pgError("23505")))).toBeUndefined()
    expect(pgConstraint(undefined)).toBeUndefined()
  })
})
