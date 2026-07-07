import Link from "next/link"
import { MaterialReview } from "@/components/material-review"
import { PageShell } from "@/components/page-shell"
import { getPendingMaterials } from "@/app/actions/materials"
import { requireAdmin } from "@/lib/auth-session"

export const dynamic = "force-dynamic"

export default async function AdminMaterialsPage() {
  await requireAdmin()
  const pending = await getPendingMaterials()

  return (
    <PageShell
      title="Review materials"
      description={
        <>
          Pending submissions. Adjust fields before approving if needed; approved materials become
          visible to all users. See the full catalog on{" "}
          <Link href="/materials" className="underline hover:text-foreground">
            the materials page
          </Link>
          .
        </>
      }
    >
      {pending.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-border bg-card/50 px-6 py-12 text-center text-sm text-muted-foreground">
          Nothing to review — all materials are handled.
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {pending.map((m) => (
            <MaterialReview key={m.id} material={m} />
          ))}
        </div>
      )}
    </PageShell>
  )
}
