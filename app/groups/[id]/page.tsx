import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getGroupDetail } from '@/app/actions/groups';
import { getInventory } from '@/app/actions/filaments';
import { GroupSharingSettings } from '@/components/group-sharing-settings';
import { GroupOwnerTools } from '@/components/group-owner-tools';
import { PageShell } from '@/components/page-shell';
import { requireUser } from '@/lib/auth-session';
import type { Material } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

// Group management only — the group's stock lives on the dashboard (one tab
// per group) and lend handling on the dashboard "Borrows" tab.
export default async function GroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  const groupId = id;
  if (!groupId) notFound();

  const detail = await getGroupDetail(groupId);
  if (!detail) redirect('/groups');

  // Distinct materials the user has spools of — sharing is material-level
  const inventoryRows = await getInventory();
  const ownMaterials = [
    ...new Map<string, Material>(
      inventoryRows.map((r) => [r.material.id, r.material])
    ).values(),
  ];
  const isOwner = detail.myMembership.role === 'owner';

  return (
    <PageShell
      title={detail.group.name}
      description={`${detail.members.length} member${detail.members.length === 1 ? '' : 's'} — browse this group's stock on the dashboard`}
      backHref="/groups"
      backLabel="Back to groups"
    >
      <p className="text-muted-foreground mt-4 text-sm">
        Shared spools and borrow requests moved to the{' '}
        <Link
          href="/"
          className="hover:text-foreground underline underline-offset-4"
        >
          dashboard
        </Link>{' '}
        (group tab & Borrows tab). This page manages membership and sharing.
      </p>

      <section className="border-border bg-card mt-6 rounded-lg border p-6">
        <h2 className="font-semibold">My sharing</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Control which of your materials (all their spools) are visible to this
          group.
        </p>
        <div className="mt-4">
          <GroupSharingSettings
            groupId={groupId}
            initialShareMode={
              detail.myMembership.shareMode as 'all' | 'whitelist' | 'blacklist'
            }
            initialOverrideIds={detail.myOverrideMaterialIds}
            ownMaterials={ownMaterials}
          />
        </div>
      </section>

      {isOwner && (
        <section className="border-border bg-card mt-8 rounded-lg border p-6">
          <h2 className="font-semibold">Owner tools</h2>
          <div className="mt-4">
            <GroupOwnerTools group={detail.group} members={detail.members} />
          </div>
        </section>
      )}
    </PageShell>
  );
}
