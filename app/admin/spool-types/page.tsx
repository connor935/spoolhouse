import Link from "next/link"
import { PageShell } from "@/components/page-shell"
import { SpoolTypeReview } from "@/components/spool-type-review"
import { getPendingSpoolTypes } from "@/app/actions/spool-types"
import { requireAdmin } from "@/lib/auth-session"

export const dynamic = "force-dynamic"

export default async function AdminSpoolTypesPage() {
  await requireAdmin()
  const pending = await getPendingSpoolTypes()

  return (
    <PageShell
      title="Review spool types"
      description={
        <>
          Pending submissions. Adjust fields before approving if needed; approved types become
          visible to all users. See the full catalog on{" "}
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
            <SpoolTypeReview key={t.id} spoolType={t} />
          ))}
        </div>
      )}
    </PageShell>
  )
}
