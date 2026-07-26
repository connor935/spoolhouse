'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { user } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth-session';

// Admin toggles the trusted-contributor flag: the target user's material and
// spool-type submissions then auto-approve like an admin's (see lib/catalog.ts
// request()). Written directly — the better-auth admin plugin has no
// arbitrary-field update.
export async function setTrustedContributor(userId: string, trusted: boolean) {
  await requireAdmin();
  await db
    .update(user)
    .set({ trustedContributor: trusted })
    .where(eq(user.id, userId));
  revalidatePath('/admin/users');
}
