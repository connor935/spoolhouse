// Next.js runs register() once per server instance, before it serves requests —
// the right place to apply pending Drizzle migrations, so a fresh checkout works
// with just `npm install && npm run dev` (and a deploy self-heals if the
// pre-start migration step in .github/workflows/deploy.yml was skipped).
export async function register() {
  // Also invoked for the edge runtime (no DB access) and during `next build`,
  // where no database is running.
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NEXT_PHASE === 'phase-production-build') return;
  const { runMigrations } = await import('@/lib/db');
  await runMigrations();
}
