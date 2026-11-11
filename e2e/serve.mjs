// Playwright's webServer command: reset + seed the E2E database, build the app
// (skip with E2E_SKIP_BUILD=1 when nothing changed), then serve it with its own
// PGlite host. Environment (port, DB path) comes from playwright.config.ts.
import { spawn, spawnSync } from 'node:child_process';

const port = process.env.E2E_PORT ?? '3100';

function run(cmd, args) {
  const { status } = spawnSync(cmd, args, { stdio: 'inherit' });
  if (status !== 0) process.exit(status ?? 1);
}

run('npx', ['tsx', 'e2e/seed.ts']);
if (!process.env.E2E_SKIP_BUILD) run('npx', ['next', 'build']);

// `next start` warns about output: "standalone" but serves the build fine.
const server = spawn(
  process.execPath,
  ['scripts/with-local-db.mjs', 'npx', 'next', 'start', '-p', port],
  { stdio: 'inherit' }
);
const stop = () => server.kill();
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
server.once('exit', (code) => process.exit(code ?? 0));
