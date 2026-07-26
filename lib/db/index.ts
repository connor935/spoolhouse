import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { databaseUrl } from './local.mjs';
import * as schema from './schema';

// Postgres everywhere, one driver: DATABASE_URL points at a real server in
// production, and at the local PGlite host process in development (see
// lib/db/local.mjs and scripts/pglite-server.mjs). Dev and prod therefore run
// identical SQL through identical client code.
//
// A Pool opens no connection until it is queried, so importing this module is
// cheap and side-effect-free — which is what lets `next build` collect page data
// from ~15 worker processes without any of them touching a database.
const pool = new Pool({ connectionString: databaseUrl() });

// Singleton across Next.js dev hot reloads.
const globalForDb = globalThis as unknown as {
  db?: NodePgDatabase<typeof schema>;
  migrated?: Promise<void>;
};

export const db = (globalForDb.db ??= drizzle(pool, { schema }));

// Applies pending migrations, once per process. Called from instrumentation.ts
// before the server serves requests, and by the CLI scripts, so a fresh checkout
// works without a separate migrate step.
export function runMigrations(): Promise<void> {
  return (globalForDb.migrated ??= migrate(db, {
    migrationsFolder: path.join(process.cwd(), 'drizzle'),
  }));
}

// The pool holds the event loop open. The server never needs this; the CLI
// scripts call it so they exit.
export function closeDb(): Promise<void> {
  return pool.end();
}
