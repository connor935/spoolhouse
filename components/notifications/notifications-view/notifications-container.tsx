'use client';

import { useState } from 'react';
import { approveLend, declineLend } from '@/app/actions/lends';
import type { NotificationWithStatus } from '@/app/actions/notifications';
import { BorrowRequestDialog } from '@/components/borrows/borrow-request-dialog';
import { useAsyncAction } from '@/hooks/use-async-action';
import { relativeTime } from '@/lib/dates';
import { LEND_ERROR, LEND_TOAST } from '@/lib/lend-toast';
import { NotificationsView } from './notifications-view';

/** Wires /notifications: Respond opens the approve / decline dialog. */
function NotificationsContainer({
  items,
  now,
}: {
  items: NotificationWithStatus[];
  /** Server time, so relative times render the same on server and client. */
  now: Date;
}) {
  const [active, setActive] = useState<NotificationWithStatus | null>(null);
  const { pending, run } = useAsyncAction();

  const answer = (approve: boolean) => {
    const lendId = active?.notification.lendId;
    if (!lendId) return;
    run(() => (approve ? approveLend(lendId) : declineLend(lendId)), {
      success: approve ? LEND_TOAST.approved : LEND_TOAST.declined,
      error: LEND_ERROR.answered,
      onSuccess: () => setActive(null),
    });
  };

  const n = active?.notification;
  return (
    <>
      <NotificationsView
        items={items.map((item) => ({
          item,
          time: relativeTime(item.notification.createdAt, now),
        }))}
        onRespond={setActive}
      />
      <BorrowRequestDialog
        request={
          n
            ? {
                requesterName: n.actorName,
                materialName: n.filamentName,
                groupName: n.groupName,
                time: relativeTime(n.createdAt, now),
              }
            : null
        }
        onClose={() => setActive(null)}
        onApprove={() => answer(true)}
        onDecline={() => answer(false)}
        pending={pending}
      />
    </>
  );
}

export { NotificationsContainer };
