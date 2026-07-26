import Link from 'next/link';
import { getMyGroups } from '@/app/actions/groups';
import { CreateGroupForm } from '@/components/groups/create-group-form';
import { JoinGroupForm } from '@/components/groups/join-group-form';
import { PageShell } from '@/components/layout/page-shell';
import { requireUser } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export default async function GroupsPage() {
  await requireUser();
  const myGroups = await getMyGroups();

  return (
    <PageShell
      title="Groups"
      description="Invite-only groups for sharing and lending spools with people nearby."
    >
      {myGroups.length === 0 ? (
        <div className="border-border bg-card/50 text-muted-foreground mt-6 rounded-lg border border-dashed px-6 py-12 text-center text-sm">
          You&apos;re not in any groups yet.
        </div>
      ) : (
        <ul className="divide-border border-border bg-card mt-6 divide-y rounded-lg border">
          {myGroups.map(({ group, membership }) => (
            <li key={group.id}>
              <Link
                href={`/groups/${group.id}`}
                className="hover:bg-secondary/50 flex items-center justify-between gap-4 px-6 py-4"
              >
                <span className="font-medium">{group.name}</span>
                <span className="text-muted-foreground text-xs">
                  {membership.role === 'owner' ? 'Owner' : 'Member'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className="border-border bg-card mt-6 rounded-lg border p-6">
        <h2 className="font-semibold">Create a group</h2>
        <CreateGroupForm />
      </section>

      <section className="border-border bg-card mt-6 rounded-lg border p-6">
        <h2 className="font-semibold">Join a group</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Enter an invite code you received.
        </p>
        <JoinGroupForm />
      </section>
    </PageShell>
  );
}
