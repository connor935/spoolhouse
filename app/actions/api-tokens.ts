'use server';

import { db } from '@/lib/db';
import { apiTokens } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth-session';
import { generateApiToken } from '@/lib/api-auth';
import { and, desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

// API-token management for /account. The plaintext token exists only in the
// createApiToken return value — afterwards only the hash remains.

export async function getApiTokens() {
  const user = await requireUser();
  return db
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      tokenPrefix: apiTokens.tokenPrefix,
      createdAt: apiTokens.createdAt,
      lastUsedAt: apiTokens.lastUsedAt,
    })
    .from(apiTokens)
    .where(eq(apiTokens.userId, user.id))
    .orderBy(desc(apiTokens.createdAt));
}

export async function createApiToken(name: string): Promise<{ token: string }> {
  const user = await requireUser();
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Token name is required');
  const { token, tokenHash, tokenPrefix } = generateApiToken();
  await db
    .insert(apiTokens)
    .values({ userId: user.id, name: trimmed, tokenHash, tokenPrefix });
  revalidatePath('/account');
  return { token };
}

export async function revokeApiToken(id: number) {
  const user = await requireUser();
  await db
    .delete(apiTokens)
    .where(and(eq(apiTokens.id, id), eq(apiTokens.userId, user.id)));
  revalidatePath('/account');
}
