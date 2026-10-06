import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { apiTokens, user } from '@/lib/db/schema';

// Bearer-token auth for the external REST API (/api/v1). Tokens are created
// on /account (app/actions/api-tokens.ts); only their SHA-256 hash is stored.

export const API_TOKEN_PREFIX = 'sph_';

export function hashApiToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// The plaintext token is returned to the user exactly once.
export function generateApiToken() {
  const token = API_TOKEN_PREFIX + randomBytes(32).toString('base64url');
  return {
    token,
    tokenHash: hashApiToken(token),
    tokenPrefix: token.slice(0, 12),
  };
}

const LAST_USED_RESOLUTION_MS = 5 * 60 * 1000;

export type ApiUser = typeof user.$inferSelect;

// Resolve `Authorization: Bearer sph_…` to the token owner, or null.
// Lookup is by hash of a high-entropy secret, so no timing concerns.
export async function authenticateApiRequest(
  request: Request
): Promise<ApiUser | null> {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  if (!token.startsWith(API_TOKEN_PREFIX)) return null;

  const [row] = await db
    .select({
      tokenId: apiTokens.id,
      lastUsedAt: apiTokens.lastUsedAt,
      owner: user,
    })
    .from(apiTokens)
    .innerJoin(user, eq(apiTokens.userId, user.id))
    .where(eq(apiTokens.tokenHash, hashApiToken(token)));
  if (!row) return null;

  // lastUsedAt is informational (shown on /account), so a scale polling every
  // few seconds shouldn't turn each read into a write: only touch it once the
  // stored value is older than LAST_USED_RESOLUTION_MS.
  if (
    !row.lastUsedAt ||
    Date.now() - row.lastUsedAt.getTime() > LAST_USED_RESOLUTION_MS
  ) {
    await db
      .update(apiTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiTokens.id, row.tokenId));
  }
  return row.owner;
}

export function apiError(
  status: number,
  code: string,
  message: string
): Response {
  return Response.json({ error: { code, message } }, { status });
}

export function unauthorized(): Response {
  return apiError(401, 'unauthorized', 'Missing or invalid API token');
}
