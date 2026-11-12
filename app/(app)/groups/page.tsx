import { getMyGroupSummaries } from '@/app/actions/groups';
import { GroupsContainer } from '@/components/groups/groups-view';
import { requireUser } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export default async function GroupsPage() {
  const user = await requireUser();
  const groups = await getMyGroupSummaries();
  return <GroupsContainer groups={groups} userId={user.id} />;
}
