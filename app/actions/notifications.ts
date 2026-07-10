"use server"

import { db } from "@/lib/db"
import { lends, notifications } from "@/lib/db/schema"
import { requireUser } from "@/lib/auth-session"
import { and, count, desc, eq, isNull } from "drizzle-orm"

export async function getUnreadCount(): Promise<number> {
  const user = await requireUser()
  const [row] = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)))
  return row?.value ?? 0
}

// Includes the referenced lend's CURRENT status (null if the lend is gone),
// so the UI knows whether a lend_requested notification is still actionable.
export async function getNotifications(limit = 50) {
  const user = await requireUser()
  return db
    .select({ notification: notifications, lendStatus: lends.status })
    .from(notifications)
    .leftJoin(lends, eq(notifications.lendId, lends.id))
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
}

export type NotificationWithStatus = Awaited<ReturnType<typeof getNotifications>>[number]

export async function markAllRead() {
  const user = await requireUser()
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt)))
}
