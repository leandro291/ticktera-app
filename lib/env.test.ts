import { describe, expect, it } from "vitest"
import { envSchema } from "./env"

const base = { DATABASE_URL: "postgres://u@127.0.0.1:5432/db" }
const parse = (extra: Record<string, string>) => envSchema.safeParse({ ...base, ...extra })

describe("envSchema STRIPE_*", () => {
  it("AC22: sin variables Stripe es válido (opcionales)", () => {
    expect(parse({}).success).toBe(true)
  })

  it("AC22: vacío equivale a ausente", () => {
    const r = parse({ STRIPE_SECRET_KEY: "", NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "", STRIPE_WEBHOOK_SECRET: "" })
    expect(r.success && r.data.STRIPE_SECRET_KEY).toBeUndefined()
  })

  it("AC22: claves válidas del mismo modo", () => {
    const r = parse({ STRIPE_SECRET_KEY: "sk_test_abc", NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_abc", STRIPE_WEBHOOK_SECRET: "whsec_abc" })
    expect(r.success).toBe(true)
  })

  it.each([
    ["STRIPE_SECRET_KEY", "pk_test_abc"],
    ["STRIPE_SECRET_KEY", "sk_dev_abc"],
    ["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", "sk_test_abc"],
    ["STRIPE_WEBHOOK_SECRET", "abc"],
  ])("AC22: formato inválido en %s (%s)", (key, value) => {
    expect(parse({ [key]: value }).success).toBe(false)
  })

  it("AC22: modo sk/pk distinto es error", () => {
    expect(parse({ STRIPE_SECRET_KEY: "sk_live_abc", NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_abc" }).success).toBe(false)
  })

  it("AC22: una sola clave presente no dispara el chequeo de modo", () => {
    expect(parse({ STRIPE_SECRET_KEY: "sk_live_abc" }).success).toBe(true)
  })
})
