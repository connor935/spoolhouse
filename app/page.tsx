import { getFilaments } from "@/app/actions/filaments"
import { getUsableSpoolTypes } from "@/app/actions/spool-types"
import { WarehouseDashboard } from "@/components/warehouse-dashboard"
import { requireUser } from "@/lib/auth-session"
import { toFilamentView } from "@/lib/filament"

export const dynamic = "force-dynamic"

export default async function Page() {
  const user = await requireUser()
  const [rows, spoolTypes] = await Promise.all([getFilaments(), getUsableSpoolTypes()])
  const filaments = rows.map((r) => toFilamentView(r.filaments, r.spool_types))
  return (
    <WarehouseDashboard
      filaments={filaments}
      spoolTypes={spoolTypes}
      user={{ name: user.name, isAdmin: user.role === "admin" }}
    />
  )
}
