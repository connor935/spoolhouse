import type * as React from 'react';

import { ActivityItem, type ActivityKind } from '../activity-item';
import { cn } from '@/lib/utils';

export type ActivityEntry = {
  id: string;
  time: string;
  dateTime?: string;
  kind: ActivityKind;
  unread?: boolean;
  content: React.ReactNode;
};

/** The Overview's "Recent activity" feed: a list of `ActivityItem`s. */
function ActivityList({
  items,
  label = 'Recent activity',
  className,
}: {
  items: ActivityEntry[];
  /** Accessible name of the list. */
  label?: string;
  className?: string;
}) {
  if (items.length === 0) {
    return (
      <p
        data-slot="activity-list-empty"
        className={cn('text-muted-foreground text-sm', className)}
      >
        Nothing happened yet — weighings, requests and borrows show up here.
      </p>
    );
  }
  return (
    <ul data-slot="activity-list" aria-label={label} className={className}>
      {items.map((item) => (
        <ActivityItem
          key={item.id}
          time={item.time}
          dateTime={item.dateTime}
          kind={item.kind}
          unread={item.unread}
        >
          {item.content}
        </ActivityItem>
      ))}
    </ul>
  );
}

export { ActivityList };
