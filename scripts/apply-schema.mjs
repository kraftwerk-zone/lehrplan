/**
 * Applies the SQL migration to Supabase.
 *
 * Requires SUPABASE_DB_URL in .env.local, e.g.:
 *   SUPABASE_DB_URL=postgresql://postgres.[ref]:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
 *
 * Find the password in: Supabase Dashboard → Project Settings → Database
 *
 * Usage: node scripts/apply-schema.mjs
 */

import { readdirSync, readFileSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import postgres from "postgres"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(root, ".env.local"), "utf8")
    for (const line of raw.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const idx = trimmed.indexOf("=")
      if (idx === -1) continue
      const key = trimmed.slice(0, idx)
      const value = trimmed.slice(idx + 1)
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // .env.local optional if vars are already set
  }
}

loadEnvLocal()

const dbUrl = process.env.SUPABASE_DB_URL
if (!dbUrl) {
  console.error(
    "SUPABASE_DB_URL fehlt. Bitte in .env.local setzen (Dashboard → Project Settings → Database → Connection string).",
  )
  process.exit(1)
}

const migrationsDir = resolve(root, "supabase/migrations")
const migrationFiles = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort()

const db = postgres(dbUrl, { ssl: "require", max: 1 })

try {
  for (const file of migrationFiles) {
    const sql = readFileSync(resolve(migrationsDir, file), "utf8")
    await db.unsafe(sql)
    console.log(`Migration angewendet: ${file}`)
  }
  console.log("Alle Migrationen erfolgreich angewendet.")
} catch (err) {
  console.error("Migration fehlgeschlagen:", err)
  process.exit(1)
} finally {
  await db.end({ timeout: 5 })
}
