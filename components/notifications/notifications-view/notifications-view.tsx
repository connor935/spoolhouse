import { BellIcon } from 'lucide-react';
import type { NotificationWithStatus } from '@/app/actions/notifications';
import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { NotificationRow } from '../notification-row';

export type NotificationListItem = {
  item: NotificationWithStatus;
  /** "just now", "12 min ago", "18 Sep" */
  time: string;
};

type NotificationsViewProps = {
  items: NotificationListItem[];
  /** Opens the approve / decline dialog for an open borrow request. */
  onRespond: (item: NotificationWithStatus) => void;
};

/**
 * The /notifications page (Notifications board). Rows unread when the page
 * was opened stay highlighted for this visit; the page marks them read.
 */
function NotificationsView({ items, onRespond }: NotificationsViewProps) {
  const unread = items.filter((i) => i.item.notification.readAt === null);
  return (
    <div data-slot="notifications-view" className="flex flex-col gap-6">
      <PageHeader
        kicker="Notifications"
        meta={
          unread.length > 0
            ? `${unread.length} unread · now marked read`
            : 'All caught up'
        }
        title="Notifications"
      />
      {items.length === 0 ? (
        <EmptyState
          icon={<BellIcon />}
          title="Nothing yet"
          description="Borrow requests and lending updates will show up here."
        />
      ) : (
        <>
          <ul aria-label="Notifications" className="border-border border-t">
            {items.map(({ item, time }) => (
              <NotificationRow
                key={item.notification.id}
                item={item}
                time={time}
                onRespond={() => onRespond(item)}
              />
            ))}
          </ul>
          <p className="fine text-muted-foreground">
            Only borrow activity creates notifications.
          </p>
        </>
      )}
    </div>
  );
}

export { NotificationsView };
