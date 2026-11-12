import { NotificationsContainer } from '@/components/notifications/notifications-view';
import { getNotifications, markAllRead } from '@/app/actions/notifications';
import { requireUser } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  await requireUser();
  // Fetch first so unread rows can be highlighted once, then clear the counter.
  const items = await getNotifications();
  await markAllRead();

  return <NotificationsContainer items={items} now={new Date()} />;
}
