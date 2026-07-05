import Link from "next/link"
import { getMyGroups } from "@/app/actions/groups"
import { CreateGroupForm } from "@/components/create-group-form"
import { JoinGroupForm } from "@/components/join-group-form"
import { PageShell } from "@/components/page-shell"
import { requireUser } from "@/lib/auth-session"

export const dynamic = "force-dynamic"

export default async function GroupsPage() {
  await requireUser()
  const myGroups = await getMyGroups()

  return (
    <PageShell
      title="Groups"
      description="Invite-only groups for sharing and lending spools with people nearby."
    >
      {myGroups.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-card/50 px-6 py-12 text-center text-sm text-muted-foreground">
          You&apos;re not in any groups yet.
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-card">
          {myGroups.map(({ group, membership }) => (
            <li key={group.id}>
              <Link
                href={`/groups/${group.id}`}
                className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-secondary/50"
              >
                <span className="font-medium">{group.name}</span>
                <span className="text-xs text-muted-foreground">
                  {membership.role === "owner" ? "Owner" : "Member"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-6 rounded-lg border border-border bg-card p-6">
        <h2 className="font-semibold">Create a group</h2>
        <CreateGroupForm />
      </section>

      <section className="mt-6 rounded-lg border border-border bg-card p-6">
        <h2 className="font-semibold">Join a group</h2>
        <p className="mt-1 text-sm text-muted-foreground">Enter an invite code you received.</p>
        <JoinGroupForm />
      </section>
    </PageShell>
  )
}
