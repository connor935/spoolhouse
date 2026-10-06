// The local development database: one PGlite instance (embedded Postgres, WASM —
// nothing to install) exposed on a TCP port via the Postgres wire protocol.
//
// Everything else connects as an ordinary Postgres client, which is what makes
// dev safe: PGlite is a single Postgres over a data directory, and `next dev`
// alone runs app code in two processes (the server and a route worker). Opening
// the directory from several processes would give each its own isolated — and
// mutually corrupting — view, so exactly this process owns it.
//
// Started automatically by `npm run dev` (scripts/with-local-db.mjs); run it
// directly (`npm run db:serve`) to keep the DB up for drizzle-kit studio or psql.
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import {
  LOCAL_DATA_DIR,
  LOCAL_DB_HOST,
  LOCAL_DB_PORT,
} from '../lib/db/local.mjs';

mkdirSync(path.resolve(LOCAL_DATA_DIR), { recursive: true });

// Contrib extensions ship as separate WASM bundles and must be registered here
// before a migration can CREATE EXTENSION them (pg_trgm: catalog search index,
// drizzle/0008_material_search_trgm.sql).
const client = new PGlite(LOCAL_DATA_DIR, { extensions: { pg_trgm } });
await client.waitReady;

const server = new PGLiteSocketServer({
  db: client,
  host: LOCAL_DB_HOST,
  port: LOCAL_DB_PORT,
  // Default is 1. The Next server, its route workers and any CLI script each
  // hold their own pool; queries are serialized inside PGlite regardless.
  maxConnections: 20,
});
await server.start();

// scripts/with-local-db.mjs waits for this line before starting Next.
console.log(
  `[db] PGlite ready on ${LOCAL_DB_HOST}:${LOCAL_DB_PORT} (${LOCAL_DATA_DIR})`
);

let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  await server.stop();
  await client.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
