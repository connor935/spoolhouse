import { getFilaments } from "@/app/actions/filaments"
import { getActiveLendsForOwner } from "@/app/actions/lends"
import { getUsableSpoolTypes } from "@/app/actions/spool-types"
import { WarehouseDashboard } from "@/components/warehouse-dashboard"
import { requireUser } from "@/lib/auth-session"
import { toFilamentView } from "@/lib/filament"

export const dynamic = "force-dynamic"

export default async function Page() {
  const user = await requireUser()
  const [rows, spoolTypes, activeLends] = await Promise.all([
    getFilaments(),
    getUsableSpoolTypes(),
    getActiveLendsForOwner(),
  ])
  const lentToByFilamentId = new Map(activeLends.map((l) => [l.filamentId, l.borrowerName]))
  const filaments = rows.map((r) => ({
    ...toFilamentView(r.filaments, r.spool_types),
    lentToName: lentToByFilamentId.get(r.filaments.id) ?? null,
  }))
  return (
    <WarehouseDashboard
      filaments={filaments}
      spoolTypes={spoolTypes}
      user={{ name: user.name, isAdmin: user.role === "admin" }}
    />
  )
}
