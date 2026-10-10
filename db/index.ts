import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import { env } from "../lib/env"
import * as schema from "./schema"

// Reuse a single Pool across dev hot reloads
const globalForPool = globalThis as unknown as { pgPool?: Pool }

const pool = globalForPool.pgPool ?? new Pool({ connectionString: env.DATABASE_URL })

if (process.env.NODE_ENV !== "production") globalForPool.pgPool = pool

export const db = drizzle(pool, { schema })
