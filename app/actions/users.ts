'use server';

import { asc, count, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { spools, user } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth-session';

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  trustedContributor: boolean;
  spoolCount: number;
};

// Every account for /admin/users, oldest first, with how many spools each owns.
export async function getUsersForAdmin(): Promise<AdminUserRow[]> {
  await requireAdmin();
  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      trustedContributor: user.trustedContributor,
      spoolCount: count(spools.id),
    })
    .from(user)
    .leftJoin(spools, eq(spools.userId, user.id))
    .groupBy(user.id)
    .orderBy(asc(user.createdAt));
  return rows.map(({ role, trustedContributor, ...r }) => ({
    ...r,
    isAdmin: role === 'admin',
    trustedContributor: trustedContributor === true,
  }));
}

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
