import { defineConfig } from "drizzle-kit"

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema/index.ts",
  out: "./drizzle",
  // `!`: the type requires a value, but `generate` never connects; migrate/push fail loudly if unset
  dbCredentials: { url: process.env.DATABASE_URL! },
})
