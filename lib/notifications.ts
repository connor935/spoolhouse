import "server-only"

import { db } from "@/lib/db"
import { notifications, type NewNotification } from "@/lib/db/schema"

export type NotificationType =
  | "lend_requested"
  | "lend_approved"
  | "lend_declined"
  | "lend_returned"
  | "lend_request_cancelled"

// Internal writer used by the lend actions — deliberately NOT a server action.
export async function createNotification(input: {
  userId: string
  type: NotificationType
  actorName: string
  filamentName: string
  groupName: string
  lendId?: number
}) {
  const values: NewNotification = {
    userId: input.userId,
    type: input.type,
    actorName: input.actorName,
    filamentName: input.filamentName,
    groupName: input.groupName,
    lendId: input.lendId ?? null,
  }
  await db.insert(notifications).values(values)
}
