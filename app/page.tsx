import { getInventory } from "@/app/actions/filaments"
import { getMyGroups } from "@/app/actions/groups"
import { getActiveLendsForOwner, getMyLends } from "@/app/actions/lends"
import { getUsableMaterials } from "@/app/actions/materials"
import { getUnreadCount } from "@/app/actions/notifications"
import { getUsableSpoolTypes } from "@/app/actions/spool-types"
import { WarehouseDashboard } from "@/components/warehouse-dashboard"
import { requireUser } from "@/lib/auth-session"
import { groupInventory } from "@/lib/filament"
import { getSharedFilaments } from "@/lib/sharing"

export const dynamic = "force-dynamic"

export default async function Page() {
  const user = await requireUser()
  const [rows, usableMaterials, spoolTypes, activeLends, myGroups, unreadCount, myLends] =
    await Promise.all([
      getInventory(),
      getUsableMaterials(),
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
  const lentToBySpoolId = new Map(activeLends.map((l) => [l.spoolId, l.borrowerName]))
  const inventory = groupInventory(rows, lentToBySpoolId)
  return (
    <WarehouseDashboard
      inventory={inventory}
      usableMaterials={usableMaterials}
      spoolTypes={spoolTypes}
      groups={groups}
      myLends={myLends}
      unreadCount={unreadCount}
      user={{ id: user.id, name: user.name, isAdmin: user.role === "admin" }}
    />
  )
}
