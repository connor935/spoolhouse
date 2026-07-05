import { getFilaments } from "@/app/actions/filaments"
import { WarehouseDashboard } from "@/components/warehouse-dashboard"
import { requireUser } from "@/lib/auth-session"
import { toFilamentView } from "@/lib/filament"

export const dynamic = "force-dynamic"

export default async function Page() {
  const user = await requireUser()
  const rows = await getFilaments()
  const filaments = rows.map(toFilamentView)
  return (
    <WarehouseDashboard
      filaments={filaments}
      user={{ name: user.name, isAdmin: user.role === "admin" }}
    />
  )
}
