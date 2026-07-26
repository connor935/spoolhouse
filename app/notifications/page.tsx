import { Bell } from 'lucide-react';
import { NotificationsList } from '@/components/notifications/notifications-list';
import { PageShell } from '@/components/layout/page-shell';
import { getNotifications, markAllRead } from '@/app/actions/notifications';
import { requireUser } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  await requireUser();
  // Fetch first so unread rows can be highlighted once, then clear the counter.
  const items = await getNotifications();
  await markAllRead();

  return (
    <PageShell
      title="Notifications"
      description="Lending activity in your groups. Click a borrow request to respond."
    >
      {items.length === 0 ? (
        <div className="border-border bg-card/50 mt-6 flex flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center">
          <Bell className="text-muted-foreground h-8 w-8" />
          <p className="text-muted-foreground text-sm">
            Nothing yet — borrow requests and lending updates will show up here.
          </p>
        </div>
      ) : (
        <NotificationsList items={items} />
      )}
    </PageShell>
  );
}
