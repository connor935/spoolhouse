import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { SpoolTypeReview } from "@/components/spool-type-review"
import { getPendingSpoolTypes } from "@/app/actions/spool-types"
import { requireAdmin } from "@/lib/auth-session"

export const dynamic = "force-dynamic"

export default async function AdminSpoolTypesPage() {
  await requireAdmin()
  const pending = await getPendingSpoolTypes()

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>
      <h1 className="text-xl font-semibold tracking-tight">Review spool types</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pending submissions. Adjust fields before approving if needed; approved types become
        visible to all users. See the full catalog on{" "}
        <Link href="/spool-types" className="underline hover:text-foreground">
          the catalog page
        </Link>
        .
      </p>

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
    </main>
  )
}
