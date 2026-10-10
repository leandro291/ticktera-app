import { parseArgs } from "node:util"
import { inArray } from "drizzle-orm"
import { categories, events, ticketTypes, users } from "../schema"
import { buildSeedRows } from "./mock-to-rows"

const USAGE =
  "Usage: npm run db:seed -- --organizer <email> [--organizer <email> ...] [--slug-suffix <text>]   (or SEED_ORGANIZER_EMAIL=a@x.com,b@x.com)"

function fail(message: string): never {
  console.error(`seed: ${message}`)
  process.exit(1)
}

async function main() {
  if (process.env.NODE_ENV === "production") fail("refusing to run with NODE_ENV=production")

  const { values } = parseArgs({ options: { organizer: { type: "string", multiple: true }, "slug-suffix": { type: "string" } } })
  const emails = [
    ...new Set(
      (values.organizer ?? process.env.SEED_ORGANIZER_EMAIL?.split(",") ?? []).map((e) => e.trim().toLowerCase()).filter(Boolean),
    ),
  ]
  if (emails.length === 0) fail(`organizer email is required.\n${USAGE}`)

  // Dynamic import: only touch the DB (and env validation) after args and environment are checked.
  const { db } = await import("../index")

  try {
    const found = await db.select().from(users).where(inArray(users.email, emails))
    for (const email of emails) {
      const organizer = found.find((u) => u.email === email)
      if (!organizer) fail(`no user with email ${email}. Create the organizer first.`)
      if (!["organizer", "admin", "super_admin"].includes(organizer.role)) fail(`${email} has role "${organizer.role}", cannot own events.`)
      if (organizer.status === "suspended") fail(`${email} is suspended.`)
    }

    const rows = await buildSeedRows(found.map((u) => u.id), undefined, undefined, values["slug-suffix"])
    const now = new Date()

    await db.transaction(async (tx) => {
      const categoryIds = new Map<string, string>()
      for (const row of rows.categories) {
        const [saved] = await tx
          .insert(categories)
          .values(row)
          .onConflictDoUpdate({ target: categories.slug, set: { name: row.name, sortOrder: row.sortOrder } })
          .returning({ id: categories.id, slug: categories.slug })
        categoryIds.set(saved.slug, saved.id)
      }

      const eventIds = new Map<string, string>()
      for (const { categorySlug, ...row } of rows.events) {
        const categoryId = categoryIds.get(categorySlug)
        if (!categoryId) throw new Error(`unknown category "${categorySlug}" for event "${row.slug}"`)
        // status and published_at only on insert (undefined is skipped by drizzle): existing events keep theirs.
        const [saved] = await tx
          .insert(events)
          .values({ ...row, categoryId, publishedAt: now })
          .onConflictDoUpdate({ target: events.slug, set: { ...row, categoryId, slug: undefined, status: undefined, organizerId: undefined } })
          .returning({ id: events.id, slug: events.slug })
        eventIds.set(saved.slug, saved.id)
      }

      for (const { eventSlug, ...row } of rows.ticketTypes) {
        const eventId = eventIds.get(eventSlug)
        if (!eventId) throw new Error(`unknown event "${eventSlug}" for ticket type "${row.name}"`)
        await tx
          .insert(ticketTypes)
          .values({ ...row, eventId })
          .onConflictDoUpdate({ target: [ticketTypes.eventId, ticketTypes.name], set: row })
      }
    })

    console.log(
      `seed: ${rows.categories.length} categories, ${rows.events.length} events, ${rows.ticketTypes.length} ticket types for ${emails.join(", ")}`,
    )
    for (const s of rows.skipped) console.log(`seed: skipped ${s.id}: ${s.reason}`)
  } finally {
    await db.$client.end()
  }
}

main().catch((err) => {
  console.error("seed: failed", err)
  process.exit(1)
})
