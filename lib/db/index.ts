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
  const db = drizzle(sqlite, { schema })
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") })
  return db
}

// Singleton across Next.js dev hot reloads
const globalForDb = globalThis as unknown as { db?: BetterSQLite3Database<typeof schema> }
export const db = (globalForDb.db ??= createDb())
