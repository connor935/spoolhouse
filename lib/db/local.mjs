// Database connection details — plain ESM so the app (TypeScript),
// drizzle.config.ts and the plain-node dev scripts all share one definition.
//
// Local dev runs PGlite (embedded Postgres, WASM — no server to install) inside
// one host process that speaks the Postgres wire protocol on a TCP port; see
// scripts/pglite-server.mjs. Everything else — the Next server, its route
// workers, the CLI scripts, drizzle-kit — connects as an ordinary Postgres
// client, so dev uses the same driver and dialect as production.
import { readFileSync } from 'node:fs';

export const LOCAL_DB_HOST = '127.0.0.1';
export const LOCAL_DB_PORT = Number(process.env.DEV_DB_PORT ?? 5433);

// PGlite accepts any credentials; the names are what its socket server reports.
export const LOCAL_DATABASE_URL = `postgres://postgres:postgres@${LOCAL_DB_HOST}:${LOCAL_DB_PORT}/postgres`;

// Directory holding the local PGlite cluster.
export const LOCAL_DATA_DIR = process.env.DATABASE_PATH ?? 'data/pglite';

// Which Postgres to talk to, in order of precedence:
//
//   1. DATABASE_URL — a full connection string.
//   2. DATABASE_PASSWORD_FILE — for Docker secrets, which are files rather than
//      env vars (the deployment keeps one password file shared with the
//      postgres container's initdb script, so it is never duplicated). The rest
//      of the connection defaults to the deployment's names and can be
//      overridden with DATABASE_HOST / DATABASE_PORT / DATABASE_USER /
//      DATABASE_NAME.
//   3. Neither — the local PGlite host process (development).
export function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const passwordFile = process.env.DATABASE_PASSWORD_FILE;
  if (!passwordFile) return LOCAL_DATABASE_URL;

  const password = readFileSync(passwordFile, 'utf8').trim();
  const host = process.env.DATABASE_HOST ?? 'postgres';
  const port = process.env.DATABASE_PORT ?? '5432';
  const user = process.env.DATABASE_USER ?? 'spoolhouse';
  const name = process.env.DATABASE_NAME ?? 'spoolhouse';
  return `postgres://${user}:${encodeURIComponent(password)}@${host}:${port}/${name}`;
}
