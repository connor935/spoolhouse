import Database from "better-sqlite3"
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3"
import { migrate } from "drizzle-orm/better-sqlite3/migrator"
import { mkdirSync } from "node:fs"
import path from "node:path"
import * as schema from "./schema"

export const DB_PATH = process.env.DATABASE_PATH ?? "data/spoolhouse.db"

function createDb(): BetterSQLite3Database<typeof schema> {
  mkdirSync(path.dirname(path.resolve(DB_PATH)), { recursive: true })
  const sqlite = new Database(DB_PATH)
  sqlite.pragma("journal_mode = WAL")
  // Wait for the lock instead of erroring — `next build` opens the DB from
  // many worker processes at once.
  sqlite.pragma("busy_timeout = 5000")
  const db = drizzle(sqlite, { schema })
  // Skip migrations during `next build` page-data collection (many workers
  // would race on a fresh DB), and for CLI scripts that only touch data on an
  // already-migrated DB (SPOOLHOUSE_SKIP_MIGRATE=1). They run at server startup.
  const skipMigrate =
    process.env.NEXT_PHASE === "phase-production-build" || process.env.SPOOLHOUSE_SKIP_MIGRATE === "1"
  if (!skipMigrate) {
    migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") })
  }
  return db
}

// Singleton across Next.js dev hot reloads
const globalForDb = globalThis as unknown as { db?: BetterSQLite3Database<typeof schema> }
export const db = (globalForDb.db ??= createDb())
