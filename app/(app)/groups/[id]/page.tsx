import { redirect } from 'next/navigation';
import { getInventory } from '@/app/actions/filaments';
import { getGroupDetail } from '@/app/actions/groups';
import { GroupDetailContainer } from '@/components/groups/group-detail';
import type { ShareMode } from '@/components/groups/share-mode-picker';
import { requireUser } from '@/lib/auth-session';
import { groupInventory } from '@/lib/filament';
import { getStockForMyGroups } from '@/lib/sharing';
import { getSpoolNumbers } from '@/lib/spool-numbers';

export const dynamic = 'force-dynamic';

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const [{ id }, query] = await Promise.all([params, searchParams]);

  // Membership check first: null for non-members and unknown ids.
  const detail = await getGroupDetail(id);
  if (!detail) redirect('/groups');

  // Membership is confirmed above, so the group is among the viewer's own;
  // the shell's nav counts already resolved this stock for the request.
  const [stockByGroup, rows] = await Promise.all([
    getStockForMyGroups(user.id),
    getInventory(),
  ]);
  const stock = stockByGroup.get(id) ?? [];
  const spoolNumbers = await getSpoolNumbers(stock.map((s) => s.id));

  // Sharing is material-level: every material you have spools of, with how
  // many of them (non-empty) would be visible.
  const ownMaterials = groupInventory(rows).map(({ material, spools }) => ({
    id: material.id,
    name: material.name,
    manufacturer: material.manufacturer,
    filamentType: material.filamentType,
    color: material.color,
    spoolCount: spools.filter((s) => !s.isEmpty).length,
  }));

  return (
    <GroupDetailContainer
      group={{
        id: detail.group.id,
        name: detail.group.name,
        inviteCode: detail.group.inviteCode,
      }}
      members={detail.members
        .map(({ member, name }) => ({
          id: member.userId,
          name,
          role: member.role as 'owner' | 'member',
          joinedAt: member.joinedAt,
        }))
        .sort(
          (a, b) =>
            Number(b.role === 'owner') - Number(a.role === 'owner') ||
            a.joinedAt.getTime() - b.joinedAt.getTime()
        )}
      stock={stock}
      spoolNumbers={Object.fromEntries(spoolNumbers)}
      currentUserId={user.id}
      share={{
        mode: detail.myMembership.shareMode as ShareMode,
        overrideIds: detail.myOverrideMaterialIds,
      }}
      ownMaterials={ownMaterials}
      activeLendCount={detail.activeLendCount}
      activeLendsByUserId={detail.activeLendsByUserId}
      view={query.view === 'settings' ? 'settings' : 'stock'}
    />
  );
}
