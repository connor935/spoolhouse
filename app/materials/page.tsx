import { Badge } from "@/components/ui/badge"
import { PageShell } from "@/components/page-shell"
import { RequestMaterialForm } from "@/components/request-material-form"
import { getMaterialCatalog } from "@/app/actions/materials"
import { requireUser } from "@/lib/auth-session"

export const dynamic = "force-dynamic"

export default async function MaterialsPage() {
  const user = await requireUser()
  const catalog = await getMaterialCatalog()

  const byManufacturer = new Map<string, typeof catalog>()
  for (const m of catalog) {
    const list = byManufacturer.get(m.manufacturer) ?? []
    list.push(m)
    byManufacturer.set(m.manufacturer, list)
  }

  return (
    <PageShell
      title="Materials"
      description="Global material catalog. Missing one? Request it below — you can use it immediately while an admin reviews it."
    >
      {[...byManufacturer.entries()].map(([manufacturer, list]) => (
        <section key={manufacturer} className="mt-6 rounded-lg border border-border bg-card">
          <h2 className="border-b border-border px-6 py-3 font-semibold">{manufacturer}</h2>
          <ul className="divide-y divide-border">
            {list.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-4 px-6 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className="h-5 w-5 shrink-0 rounded-full border border-border shadow-inner"
                    style={{ backgroundColor: m.color ?? "#94a3b8" }}
                    aria-hidden
                  />
                  <span>{m.name}</span>
                  {m.status === "pending" && (
                    <Badge variant="outline" className="text-muted-foreground">
                      Pending review
                    </Badge>
                  )}
                  {m.status === "rejected" && m.submittedById === user.id && (
                    <Badge variant="outline" className="border-destructive/40 text-destructive">
                      Rejected
                    </Badge>
                  )}
                </div>
                <Badge variant="secondary" className="shrink-0 font-mono text-xs">
                  {m.filamentType}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="mt-6 rounded-lg border border-border bg-card p-6">
        <h2 className="font-semibold">Request a new material</h2>
        <RequestMaterialForm />
      </section>
    </PageShell>
  )
}
