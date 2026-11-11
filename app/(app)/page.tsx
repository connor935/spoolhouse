import { redirect } from 'next/navigation';
import { getInventory } from '@/app/actions/filaments';
import { getActiveLendsForOwner, getMyLends } from '@/app/actions/lends';
import { getUsableSpoolTypes } from '@/app/actions/spool-types';
import { OverviewPage } from '@/components/overview/overview-page';
import { requireUser } from '@/lib/auth-session';
import { groupInventory } from '@/lib/filament';
import { legacyDashboardRedirect } from '@/lib/inventory-params';
import { getNavCounts } from '@/lib/nav-counts';
import { getRecentActivity } from '@/lib/recent-activity';
import { getOverviewUsage } from '@/lib/usage-stats';

export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  // Links from the old tabbed dashboard (`/?tab=…&q=…`) moved to their pages.
  const legacy = legacyDashboardRedirect(await searchParams);
  if (legacy) redirect(legacy);

  const now = new Date();
  const [rows, activeLends, lends, spoolTypes, usage, activity, counts] =
    await Promise.all([
      getInventory(),
      getActiveLendsForOwner(),
      getMyLends(),
      getUsableSpoolTypes(),
      getOverviewUsage(user.id, now),
      getRecentActivity(user.id),
      getNavCounts(),
    ]);
  const inventory = groupInventory(
    rows,
    new Map(activeLends.map((l) => [l.spoolId, l.borrowerName]))
  );

  return (
    <OverviewPage
      userId={user.id}
      isAdmin={user.role === 'admin'}
      now={now}
      inventory={inventory}
      usage={usage}
      activity={activity}
      lends={lends}
      groups={counts.groups}
      spoolTypes={spoolTypes}
    />
  );
}
