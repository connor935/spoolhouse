'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { approveLend, declineLend } from '@/app/actions/lends';
import type { NotificationWithStatus } from '@/app/actions/notifications';
import type { Notification } from '@/lib/db/schema';
import { useAsyncAction } from '@/hooks/use-async-action';
import { LEND_TOAST } from '@/lib/lend-toast';

function notificationText(n: Notification) {
  switch (n.type) {
    case 'lend_requested':
      return (
        <>
          <strong>{n.actorName}</strong> requested to borrow{' '}
          <strong>{n.filamentName}</strong> in <strong>{n.groupName}</strong>
        </>
      );
    case 'lend_approved':
      return (
        <>
          <strong>{n.actorName}</strong> approved your request for{' '}
          <strong>{n.filamentName}</strong> in <strong>{n.groupName}</strong>
        </>
      );
    case 'lend_declined':
      return (
        <>
          <strong>{n.actorName}</strong> declined your request for{' '}
          <strong>{n.filamentName}</strong> in <strong>{n.groupName}</strong>
        </>
      );
    case 'lend_returned':
      return (
        <>
          <strong>{n.actorName}</strong> marked{' '}
          <strong>{n.filamentName}</strong> as returned in{' '}
          <strong>{n.groupName}</strong>
        </>
      );
    case 'lend_request_cancelled':
      return (
        <>
          <strong>{n.actorName}</strong> cancelled their request for{' '}
          <strong>{n.filamentName}</strong> in <strong>{n.groupName}</strong>
        </>
      );
    default:
      return (
        <>
          {n.actorName} — {n.filamentName} ({n.groupName})
        </>
      );
  }
}

function relativeTime(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d ago`;
  return date.toLocaleDateString();
}

export function NotificationsList({
  items,
}: {
  items: NotificationWithStatus[];
}) {
  const [active, setActive] = useState<NotificationWithStatus | null>(null);
  const { pending, run } = useAsyncAction();

  function isActionable(item: NotificationWithStatus) {
    return (
      item.notification.type === 'lend_requested' &&
      item.lendStatus === 'requested' &&
      item.notification.lendId !== null
    );
  }

  async function handle(action: 'approve' | 'decline') {
    const lendId = active?.notification.lendId;
    if (!lendId) return;
    await run(
      () => (action === 'approve' ? approveLend(lendId) : declineLend(lendId)),
      {
        success:
          action === 'approve' ? LEND_TOAST.approved : LEND_TOAST.declined,
        onSuccess: () => setActive(null),
      }
    );
  }

  return (
    <>
      <ul className="divide-border border-border bg-card mt-6 divide-y rounded-lg border">
        {items.map((item) => {
          const n = item.notification;
          const actionable = isActionable(item);
          const row = (
            <>
              <div className="flex items-start gap-3">
                {n.readAt === null && (
                  <span
                    className="bg-accent mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    aria-label="Unread"
                  />
                )}
                <p
                  className={`text-sm ${n.readAt === null ? '' : 'text-muted-foreground'}`}
                >
                  {notificationText(n)}
                  {actionable && (
                    <span className="text-accent ml-2 text-xs underline underline-offset-4">
                      Respond
                    </span>
                  )}
                </p>
              </div>
              <span className="text-muted-foreground shrink-0 text-xs">
                {relativeTime(n.createdAt)}
              </span>
            </>
          );
          return (
            <li key={n.id} className={n.readAt === null ? 'bg-accent/5' : ''}>
              {actionable ? (
                <button
                  type="button"
                  onClick={() => setActive(item)}
                  className="hover:bg-secondary/50 flex w-full items-start justify-between gap-4 px-6 py-4 text-left transition-colors"
                >
                  {row}
                </button>
              ) : (
                <div className="flex items-start justify-between gap-4 px-6 py-4">
                  {row}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Dialog
        open={active !== null}
        onOpenChange={(open) => !open && setActive(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Borrow request</DialogTitle>
            <DialogDescription>
              {active && (
                <>
                  <strong>{active.notification.actorName}</strong> wants to
                  borrow <strong>{active.notification.filamentName}</strong> in{' '}
                  <strong>{active.notification.groupName}</strong>.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setActive(null)}
            >
              Later
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handle('decline')}
              disabled={pending}
            >
              Decline
            </Button>
            <Button
              type="button"
              onClick={() => handle('approve')}
              disabled={pending}
            >
              {pending ? 'Working…' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
