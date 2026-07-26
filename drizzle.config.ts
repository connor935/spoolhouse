import { defineConfig } from 'drizzle-kit';
import { databaseUrl } from './lib/db/local.mjs';

// DATABASE_URL in production; otherwise the local PGlite host process, which
// must be running (`npm run dev` or `npm run db:serve`) for the commands that
// talk to the database (migrate, studio, push).
export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dbCredentials: { url: databaseUrl() },
});
