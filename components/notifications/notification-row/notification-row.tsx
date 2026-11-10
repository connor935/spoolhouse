import type * as React from 'react';

import type { NotificationWithStatus } from '@/app/actions/notifications';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Notification = NotificationWithStatus['notification'];

/** A borrow request that is still waiting for an answer. */
function isActionableNotification(item: NotificationWithStatus): boolean {
  return (
    item.notification.type === 'lend_requested' &&
    item.lendStatus === 'requested' &&
    item.notification.lendId !== null
  );
}

function sentence(n: Notification): React.ReactNode {
  const actor = <strong>{n.actorName}</strong>;
  const spool = <strong>{n.filamentName}</strong>;
  const group = <span className="text-muted-foreground">{n.groupName}</span>;
  switch (n.type) {
    case 'lend_requested':
      return (
        <>
          {actor} requested to borrow {spool} in {group}
        </>
      );
    case 'lend_approved':
      return (
        <>
          {actor} approved your request for {spool} in {group}
        </>
      );
    case 'lend_declined':
      return (
        <>
          {actor} declined your request for {spool} in {group}
        </>
      );
    case 'lend_returned':
      return (
        <>
          {actor} marked {spool} as returned in {group}
        </>
      );
    case 'lend_request_cancelled':
      return (
        <>
          {actor} cancelled their request for {spool} in {group}
        </>
      );
    default:
      return (
        <>
          {actor} — {spool} ({group})
        </>
      );
  }
}

type StatusTag = { label: string; variant: 'accent' | 'muted' };

// What happened, as a tag. A request that was already answered shows the
// lend's current state instead of a Respond button.
function statusTag(item: NotificationWithStatus): StatusTag | null {
  switch (item.notification.type) {
    case 'lend_approved':
      return { label: 'Approved', variant: 'accent' };
    case 'lend_declined':
      return { label: 'Declined', variant: 'muted' };
    case 'lend_returned':
      return { label: 'Returned', variant: 'muted' };
    case 'lend_request_cancelled':
      return { label: 'Cancelled', variant: 'muted' };
    case 'lend_requested':
      switch (item.lendStatus) {
        case 'requested':
          return { label: 'Pending', variant: 'accent' };
        case 'active':
          return { label: 'Approved', variant: 'accent' };
        case 'declined':
          return { label: 'Declined', variant: 'muted' };
        case 'returned':
          return { label: 'Returned', variant: 'muted' };
        default:
          // The lend row is gone: the request was withdrawn.
          return { label: 'Closed', variant: 'muted' };
      }
    default:
      return null;
  }
}

type NotificationRowProps = {
  item: NotificationWithStatus;
  /** Already formatted for display: "just now", "12 min ago", "18 Sep". */
  time: string;
  /** Opens the approve / decline dialog; shown only while actionable. */
  onRespond?: () => void;
  className?: string;
};

/**
 * One line of /notifications: unread dot, time, sentence and either a
 * Respond button (open borrow request) or a status tag. Read rows are muted.
 */
function NotificationRow({
  item,
  time,
  onRespond,
  className,
}: NotificationRowProps) {
  const n = item.notification;
  const unread = n.readAt === null;
  const respond = onRespond && isActionableNotification(item);
  const tag = respond ? null : statusTag(item);

  return (
    <li
      data-slot="notification-row"
      data-unread={unread || undefined}
      className={cn(
        'border-border grid grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-1 border-b py-3.5 text-sm sm:grid-cols-[14px_90px_minmax(0,1fr)_auto]',
        unread
          ? '[&_strong]:font-semibold'
          : 'text-muted-foreground [&_strong]:text-foreground [&_strong]:font-medium',
        className
      )}
    >
      <span className="flex justify-center">
        {unread && (
          <span className="bg-accent size-2 rounded-full">
            <span className="sr-only">Unread</span>
          </span>
        )}
      </span>
      <time
        dateTime={n.createdAt.toISOString()}
        className={cn('kicker max-sm:col-start-2', unread && 'text-foreground')}
      >
        {time}
      </time>
      <span className="max-sm:col-start-2">{sentence(n)}</span>
      <span className="justify-self-end max-sm:col-start-3 max-sm:row-span-2 max-sm:row-start-1">
        {respond ? (
          <Button size="sm" onClick={onRespond}>
            Respond
          </Button>
        ) : (
          tag && <Badge variant={tag.variant}>{tag.label}</Badge>
        )}
      </span>
    </li>
  );
}

export { isActionableNotification, NotificationRow };
