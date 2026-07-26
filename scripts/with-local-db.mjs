// Runs a command with the local development database available, so `npm run dev`
// stays a single command on a fresh checkout:
//
//   node scripts/with-local-db.mjs next dev
//
// Starts scripts/pglite-server.mjs first and shuts it down afterwards. Skipped
// when DATABASE_URL points at a real Postgres, or when the local database is
// already up in another terminal (`npm run db:serve`).
import { spawn } from 'node:child_process';
import { needsLocalDb, startLocalDb } from './local-db.mjs';

const command = process.argv.slice(2);
if (command.length === 0) {
  console.error('Usage: node scripts/with-local-db.mjs <command> [args…]');
  process.exit(1);
}

const database = (await needsLocalDb()) ? await startLocalDb() : null;
const app = spawn(command[0], command.slice(1), { stdio: 'inherit' });

const stop = () => {
  app.kill();
  database?.kill();
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

app.once('exit', (code, signal) => {
  database?.kill();
  process.exit(signal ? 1 : (code ?? 0));
});
