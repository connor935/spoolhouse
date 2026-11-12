import { getInventory } from '@/app/actions/filaments';
import { StatsView } from '@/components/stats/stats-view';
import { requireUser } from '@/lib/auth-session';
import { groupInventory } from '@/lib/filament';
import { getUsageStats } from '@/lib/usage-stats';

export const dynamic = 'force-dynamic';

export default async function StatsPage() {
  const user = await requireUser();
  const inventory = groupInventory(await getInventory());
  const stats = await getUsageStats(user.id, inventory);
  return <StatsView {...stats} />;
}
