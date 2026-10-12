'use server';

import { db } from '@/lib/db';
import { lends, notifications } from '@/lib/db/schema';
import { requireUser } from '@/lib/auth-session';
import { and, count, desc, eq, isNull, lt } from 'drizzle-orm';

function unreadWhere(userId: string) {
  return and(eq(notifications.userId, userId), isNull(notifications.readAt));
}

export async function getUnreadCount(): Promise<number> {
  const user = await requireUser();
  const [row] = await db
    .select({ value: count() })
    .from(notifications)
    .where(unreadWhere(user.id));
  return row?.value ?? 0;
}

// Includes the referenced lend's CURRENT status (null if the lend is gone),
// so the UI knows whether a lend_requested notification is still actionable.
export async function getNotifications(limit = 50) {
  const user = await requireUser();
  return db
    .select({ notification: notifications, lendStatus: lends.status })
    .from(notifications)
    .leftJoin(lends, eq(notifications.lendId, lends.id))
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export type NotificationWithStatus = Awaited<
  ReturnType<typeof getNotifications>
>[number];

// Read notifications older than this are pruned, so the table doesn't grow
// without bound. Unread ones are kept however old they are.
const READ_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

export async function markAllRead() {
  const user = await requireUser();
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(unreadWhere(user.id));
  // Piggybacks on the one place a user's notifications are already written
  // to (opening /notifications) instead of a scheduled job.
  await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.userId, user.id),
        lt(notifications.readAt, new Date(Date.now() - READ_RETENTION_MS))
      )
    );
}
