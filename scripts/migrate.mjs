// Apply Drizzle migrations once, before the server starts (Docker entrypoint).
// Plain ESM so it runs with `node` in the standalone runtime image (no tsx).
//
// The app also migrates on startup (instrumentation.ts); running this as a gated
// deploy step means a bad migration fails the deploy instead of crash-looping the
// app container.
import path from 'node:path';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { databaseUrl } from '../lib/db/local.mjs';

const url = databaseUrl();
const pool = new pg.Pool({ connectionString: url });
await migrate(drizzle(pool), {
  migrationsFolder: path.join(process.cwd(), 'drizzle'),
});
await pool.end();
console.log('[migrate] up to date:', url.replace(/:[^:@/]*@/, ':***@'));
