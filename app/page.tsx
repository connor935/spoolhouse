import { getFilaments } from "@/app/actions/filaments"
import { WarehouseDashboard } from "@/components/warehouse-dashboard"
import { toFilamentView } from "@/lib/filament"

export const dynamic = "force-dynamic"

export default async function Page() {
  const rows = await getFilaments()
  const filaments = rows.map(toFilamentView)
  return <WarehouseDashboard filaments={filaments} />
}
