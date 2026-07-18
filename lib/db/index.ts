import Database from 'better-sqlite3';
import {
  drizzle,
  type BetterSQLite3Database,
} from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import * as schema from './schema';

export const DB_PATH = process.env.DATABASE_PATH ?? 'data/spoolhouse.db';

// `next build` collects page data from ~15 worker processes that each import
// this module. During the build they must not touch the real DB file (they'd
// race on creating/locking it, and there's nothing to query), so use a private
// in-memory DB per worker and skip migrations. Migrations run at server start.
const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

function createDb(): BetterSQLite3Database<typeof schema> {
  if (isBuild) {
    return drizzle(new Database(':memory:'), { schema });
  }

  mkdirSync(path.dirname(path.resolve(DB_PATH)), { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('busy_timeout = 5000');
  const db = drizzle(sqlite, { schema });
  // Skip migrations for CLI scripts that only touch data on an already-migrated
  // DB (SPOOLHOUSE_SKIP_MIGRATE=1). Otherwise apply them on startup.
  if (process.env.SPOOLHOUSE_SKIP_MIGRATE !== '1') {
    migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
  }
  return db;
}

// Singleton across Next.js dev hot reloads
const globalForDb = globalThis as unknown as {
  db?: BetterSQLite3Database<typeof schema>;
};
export const db = (globalForDb.db ??= createDb());
