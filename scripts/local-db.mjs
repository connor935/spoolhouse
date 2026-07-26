// Helpers for making the local development database available to a process.
// Plain ESM without top-level await, so the tsx CLI scripts (transpiled to CJS)
// can require it too.
import { spawn } from 'node:child_process';
import { connect } from 'node:net';
import { LOCAL_DB_HOST, LOCAL_DB_PORT } from '../lib/db/local.mjs';

export function isPortOpen(host = LOCAL_DB_HOST, port = LOCAL_DB_PORT) {
  return new Promise((resolve) => {
    const socket = connect({ host, port });
    const done = (open) => {
      socket.destroy();
      resolve(open);
    };
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    socket.setTimeout(1000, () => done(false));
  });
}

// Spawns scripts/pglite-server.mjs and resolves once it is accepting
// connections.
export function startLocalDb() {
  const child = spawn(
    process.execPath,
    [new URL('pglite-server.mjs', import.meta.url).pathname],
    { stdio: ['ignore', 'pipe', 'inherit'] }
  );

  return new Promise((resolve, reject) => {
    let output = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      output += chunk;
      process.stdout.write(chunk);
      if (output.includes('[db] PGlite ready')) resolve(child);
    });
    child.once('exit', (code) =>
      reject(new Error(`the local database exited with code ${code}`))
    );
  });
}

// Nothing to start when DATABASE_URL names a real Postgres, or when the local
// database is already up (`npm run dev` or `npm run db:serve` elsewhere).
export async function needsLocalDb() {
  if (process.env.DATABASE_URL) return false;
  return !(await isPortOpen());
}

// Runs `body` with the local database available, shutting down a database this
// call started. Used by the CLI scripts so each works standalone on a fresh
// checkout and alongside a running dev server.
export async function withLocalDb(body) {
  const database = (await needsLocalDb()) ? await startLocalDb() : null;
  try {
    await body();
  } finally {
    database?.kill();
  }
}
