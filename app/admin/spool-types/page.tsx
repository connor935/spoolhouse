import Link from "next/link"
import { PageShell } from "@/components/page-shell"
import { SpoolTypeReview } from "@/components/spool-type-review"
import { getAllSpoolTypesForAdmin, getPendingSpoolTypes } from "@/app/actions/spool-types"
import { requireAdmin } from "@/lib/auth-session"

export const dynamic = "force-dynamic"

export default async function AdminSpoolTypesPage() {
  await requireAdmin()
  const [pending, all] = await Promise.all([getPendingSpoolTypes(), getAllSpoolTypesForAdmin()])

  return (
    <PageShell
      title="Review spool types"
      description={
        <>
          Pending submissions. Adjust fields before approving if needed; approved types become
          visible to all users. See the read-only view on{" "}
          <Link href="/spool-types" className="underline hover:text-foreground">
            the catalog page
          </Link>
          .
        </>
      }
    >
      {pending.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-card/50 px-6 py-12 text-center text-sm text-muted-foreground">
          Nothing to review — all spool types are handled.
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {pending.map((t) => (
            <SpoolTypeReview key={t.id} spoolType={t} mode="review" />
          ))}
        </div>
      )}

      <h2 className="mt-10 font-semibold">Full catalog</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Edit any spool type or delete ones no spool references.
      </p>
      <div className="mt-4 flex flex-col gap-4">
        {all.map((t) => (
          <SpoolTypeReview key={t.id} spoolType={t} mode="manage" />
        ))}
      </div>
    </PageShell>
  )
}
