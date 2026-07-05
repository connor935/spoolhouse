import { getFilaments } from "@/app/actions/filaments"
import { getMyGroups } from "@/app/actions/groups"
import { getActiveLendsForOwner, getMyLends } from "@/app/actions/lends"
import { getUnreadCount } from "@/app/actions/notifications"
import { getUsableSpoolTypes } from "@/app/actions/spool-types"
import { WarehouseDashboard } from "@/components/warehouse-dashboard"
import { requireUser } from "@/lib/auth-session"
import { toFilamentView } from "@/lib/filament"
import { getSharedFilaments } from "@/lib/sharing"

export const dynamic = "force-dynamic"

export default async function Page() {
  const user = await requireUser()
  const [rows, spoolTypes, activeLends, myGroups, unreadCount, myLends] = await Promise.all([
    getFilaments(),
    getUsableSpoolTypes(),
    getActiveLendsForOwner(),
    getMyGroups(),
    getUnreadCount(),
    getMyLends(),
  ])
  const groups = await Promise.all(
    myGroups.map(async ({ group }) => ({
      id: group.id,
      name: group.name,
      stock: await getSharedFilaments(group.id),
    })),
  )
  const lentToByFilamentId = new Map(activeLends.map((l) => [l.filamentId, l.borrowerName]))
  const filaments = rows.map((r) => ({
    ...toFilamentView(r.filaments, r.spool_types),
    lentToName: lentToByFilamentId.get(r.filaments.id) ?? null,
  }))
  return (
    <WarehouseDashboard
      filaments={filaments}
      spoolTypes={spoolTypes}
      groups={groups}
      myLends={myLends}
      unreadCount={unreadCount}
      user={{ id: user.id, name: user.name, isAdmin: user.role === "admin" }}
    />
  )
}
