import { z } from "zod"

const envSchema = z.object({
  DATABASE_URL: z
    .string({ error: "DATABASE_URL is required" })
    .regex(/^postgres(ql)?:\/\//, "DATABASE_URL must start with postgres:// or postgresql://")
    .pipe(z.url({ error: "DATABASE_URL must be a valid URL" })),
  // Empty or absent = no super admin. Clerk keys are read by the Clerk SDK from process.env, not validated here.
  SUPER_ADMIN_EMAIL: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.email().transform((e) => e.toLowerCase()).optional(),
  ),
  // Optional so `next build` never breaks: without it only cover uploads answer 503 (event-crud D15).
  BLOB_READ_WRITE_TOKEN: z.preprocess((v) => (v === "" ? undefined : v), z.string().optional()),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  throw new Error(`Invalid environment variables: ${z.prettifyError(parsed.error)}`)
}

export const env = parsed.data
