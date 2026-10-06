import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/health — liveness + DB reachability for the Docker HEALTHCHECK
// (see Dockerfile). Public on purpose (proxy.ts exempts /api/) and reveals
// nothing beyond up/down. Migrations run in instrumentation.ts before the
// server answers at all, so a 200 here also means the schema is current.
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json(
      { status: 'ok' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Health check failed:', error);
    return Response.json(
      { status: 'error' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
