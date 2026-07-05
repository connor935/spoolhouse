import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getGroupDetail } from "@/app/actions/groups"
import { getGroupLends } from "@/app/actions/lends"
import { getFilaments } from "@/app/actions/filaments"
import { getSharedFilaments } from "@/lib/sharing"
import { GroupStock } from "@/components/group-stock"
import { GroupLendRequests } from "@/components/group-lend-requests"
import { GroupLendHistory } from "@/components/group-lend-history"
import { GroupSharingSettings } from "@/components/group-sharing-settings"
import { GroupOwnerTools } from "@/components/group-owner-tools"
import { requireUser } from "@/lib/auth-session"
import { toFilamentView } from "@/lib/filament"

export const dynamic = "force-dynamic"

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const authUser = await requireUser()
  const { id } = await params
  const groupId = Number(id)
  if (!Number.isInteger(groupId)) notFound()

  const detail = await getGroupDetail(groupId)
  if (!detail) redirect("/groups")

  const [sharedFilaments, groupLends, ownFilamentRows] = await Promise.all([
    getSharedFilaments(groupId),
    getGroupLends(groupId),
    getFilaments(),
  ])
  const ownFilaments = ownFilamentRows.map((r) => toFilamentView(r.filaments, r.spool_types))
  const isOwner = detail.myMembership.role === "owner"

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <Link
        href="/groups"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to groups
      </Link>

      <h1 className="text-xl font-semibold tracking-tight">{detail.group.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {detail.members.length} member{detail.members.length === 1 ? "" : "s"}
      </p>

      <section className="mt-6">
        <h2 className="mb-3 font-semibold">Group stock</h2>
        <GroupStock groupId={groupId} filaments={sharedFilaments} currentUserId={authUser.id} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-semibold">Lend requests</h2>
        <GroupLendRequests lends={groupLends} currentUserId={authUser.id} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-semibold">Lend history</h2>
        <GroupLendHistory lends={groupLends} />
      </section>

      <section className="mt-8 rounded-lg border border-border bg-card p-6">
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
    </main>
  )
}
