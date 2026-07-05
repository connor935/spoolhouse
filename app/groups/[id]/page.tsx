import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getGroupDetail } from "@/app/actions/groups"
import { getFilaments } from "@/app/actions/filaments"
import { GroupSharingSettings } from "@/components/group-sharing-settings"
import { GroupOwnerTools } from "@/components/group-owner-tools"
import { PageShell } from "@/components/page-shell"
import { requireUser } from "@/lib/auth-session"
import { toFilamentView } from "@/lib/filament"

export const dynamic = "force-dynamic"

// Group management only — the group's stock lives on the dashboard (one tab
// per group) and lend handling on the dashboard "Borrows" tab.
export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser()
  const { id } = await params
  const groupId = Number(id)
  if (!Number.isInteger(groupId)) notFound()

  const detail = await getGroupDetail(groupId)
  if (!detail) redirect("/groups")

  const ownFilamentRows = await getFilaments()
  const ownFilaments = ownFilamentRows.map((r) => toFilamentView(r.filaments, r.spool_types))
  const isOwner = detail.myMembership.role === "owner"

  return (
    <PageShell
      title={detail.group.name}
      description={`${detail.members.length} member${detail.members.length === 1 ? "" : "s"} — browse this group's stock on the dashboard`}
      backHref="/groups"
      backLabel="Back to groups"
    >
      <p className="mt-4 text-sm text-muted-foreground">
        Shared spools and borrow requests moved to the{" "}
        <Link href="/" className="underline underline-offset-4 hover:text-foreground">
          dashboard
        </Link>{" "}
        (group tab & Borrows tab). This page manages membership and sharing.
      </p>

      <section className="mt-6 rounded-lg border border-border bg-card p-6">
        <h2 className="font-semibold">My sharing</h2>
        <p className="mt-1 text-sm text-muted-foreground">Control which of your spools are visible to this group.</p>
        <div className="mt-4">
          <GroupSharingSettings
            groupId={groupId}
            initialShareMode={detail.myMembership.shareMode as "all" | "whitelist" | "blacklist"}
            initialOverrideIds={detail.myOverrideFilamentIds}
            ownFilaments={ownFilaments}
          />
        </div>
      </section>

      {isOwner && (
        <section className="mt-8 rounded-lg border border-border bg-card p-6">
          <h2 className="font-semibold">Owner tools</h2>
          <div className="mt-4">
            <GroupOwnerTools group={detail.group} members={detail.members} />
          </div>
        </section>
      )}
    </PageShell>
  )
}
