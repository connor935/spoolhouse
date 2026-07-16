// Apply Drizzle migrations once, before the server starts (Docker entrypoint).
// Plain ESM so it runs with `node` in the standalone runtime image (no tsx).
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const DB_PATH = process.env.DATABASE_PATH ?? 'data/spoolhouse.db';
mkdirSync(path.dirname(path.resolve(DB_PATH)), { recursive: true });

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('busy_timeout = 5000');
// Table-recreation migrations (id-type changes, column drops) must run with FK
// enforcement off: a `PRAGMA foreign_keys=OFF` *inside* a migration is a no-op
// because Drizzle wraps each migration in a transaction, so set it here on the
// connection. Matches runtime (the app doesn't enable FK enforcement).
sqlite.pragma('foreign_keys = OFF');
migrate(drizzle(sqlite), {
  migrationsFolder: path.join(process.cwd(), 'drizzle'),
});
sqlite.close();
console.log('[migrate] up to date:', DB_PATH);
