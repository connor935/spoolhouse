import type * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type ActivityKind = 'weigh' | 'request' | 'borrow';

const KINDS: Record<
  ActivityKind,
  { label: string; variant: 'muted' | 'accent' }
> = {
  weigh: { label: 'Weigh', variant: 'muted' },
  request: { label: 'Request', variant: 'accent' },
  borrow: { label: 'Borrow', variant: 'muted' },
};

/**
 * One line of the Overview's "Recent activity" feed (`.led`, Main board):
 * time · text · kind tag. Emphasise names in `children` with <strong>, and
 * weights with `font-mono`.
 */
function ActivityItem({
  time,
  dateTime,
  kind,
  unread = false,
  children,
  className,
}: {
  /** Already formatted for display: "14:02", "Yday", "07 Nov". */
  time: string;
  /** Machine-readable timestamp for the <time> element. */
  dateTime?: string;
  kind: ActivityKind;
  unread?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const { label, variant } = KINDS[kind];
  return (
    <li
      data-slot="activity-item"
      data-unread={unread || undefined}
      className={cn(
        'border-border grid grid-cols-[60px_minmax(0,1fr)_auto] items-baseline gap-3.5 border-t py-[11px] first:border-t-0 first:pt-0',
        className
      )}
    >
      <span className={cn('kicker', unread && 'text-accent-ink')}>
        {unread && (
          <>
            <span aria-hidden>● </span>
            <span className="sr-only">Unread, </span>
          </>
        )}
        <time dateTime={dateTime}>{time}</time>
      </span>
      <span className="text-sm [&_strong]:font-semibold">{children}</span>
      <Badge variant={variant}>{label}</Badge>
    </li>
  );
}

export { ActivityItem };
