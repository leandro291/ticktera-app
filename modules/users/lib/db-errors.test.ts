import { describe, expect, it } from "vitest"
import { isForeignKeyViolation } from "./db-errors"

describe("isForeignKeyViolation", () => {
  it("AC15: error plano con code 23503", () => {
    expect(isForeignKeyViolation(Object.assign(new Error("fk"), { code: "23503" }))).toBe(true)
  })

  it("AC15: code 23503 anidado en cause (DrizzleQueryError simulado)", () => {
    const pg = Object.assign(new Error("fk"), { code: "23503" })
    const drizzle = new Error("Failed query", { cause: pg })
    expect(isForeignKeyViolation(drizzle)).toBe(true)
  })

  it("AC15: otro código no es violación de FK", () => {
    const pg = Object.assign(new Error("dup"), { code: "23505" })
    expect(isForeignKeyViolation(new Error("Failed query", { cause: pg }))).toBe(false)
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
