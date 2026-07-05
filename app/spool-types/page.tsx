import { Badge } from "@/components/ui/badge"
import { PageShell } from "@/components/page-shell"
import { RequestSpoolTypeForm } from "@/components/request-spool-type-form"
import { getSpoolTypeCatalog } from "@/app/actions/spool-types"
import { requireUser } from "@/lib/auth-session"

export const dynamic = "force-dynamic"

export default async function SpoolTypesPage() {
  const user = await requireUser()
  const types = await getSpoolTypeCatalog()

  const byManufacturer = new Map<string, typeof types>()
  for (const t of types) {
    const list = byManufacturer.get(t.manufacturer) ?? []
    list.push(t)
    byManufacturer.set(t.manufacturer, list)
  }

  return (
    <PageShell
      title="Spool catalog"
      description="Global spool types and their empty weights. Missing one? Request it below — you can use it immediately while an admin reviews it."
    >
      {[...byManufacturer.entries()].map(([manufacturer, list]) => (
        <section key={manufacturer} className="mt-6 rounded-lg border border-border bg-card">
          <h2 className="border-b border-border px-6 py-3 font-semibold">{manufacturer}</h2>
          <ul className="divide-y divide-border">
            {list.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 px-6 py-3">
                <div className="flex items-center gap-2">
                  <span>{t.name}</span>
                  {t.status === "pending" && (
                    <Badge variant="outline" className="text-muted-foreground">
                      Pending review
                    </Badge>
                  )}
                  {t.status === "rejected" && t.submittedById === user.id && (
                    <Badge variant="outline" className="border-destructive/40 text-destructive">
                      Rejected
                    </Badge>
                  )}
                </div>
                <span className="font-mono text-sm tabular-nums text-muted-foreground">
                  {t.emptyWeightGrams} g
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="mt-6 rounded-lg border border-border bg-card p-6">
        <h2 className="font-semibold">Request a new spool type</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Weigh a bare, empty spool and enter its details.
        </p>
        <RequestSpoolTypeForm />
      </section>
    </PageShell>
  )
}
