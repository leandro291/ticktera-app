import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z
    .string({ error: "DATABASE_URL is required" })
    .regex(/^postgres(ql)?:\/\//, "DATABASE_URL must start with postgres:// or postgresql://")
    .pipe(z.url({ error: "DATABASE_URL must be a valid URL" })),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${z.prettifyError(parsed.error)}`)
}

export const env = parsed.data
