import { getInventory } from '@/app/actions/filaments';
import { getMyGroups } from '@/app/actions/groups';
import { getActiveLendsForOwner, getMyLends } from '@/app/actions/lends';
import { getUnreadCount } from '@/app/actions/notifications';
import { getPropertyDefinitions } from '@/app/actions/properties';
import { getUsableSpoolTypes } from '@/app/actions/spool-types';
import { WarehouseDashboard } from '@/components/dashboard/warehouse-dashboard';
import { requireUser } from '@/lib/auth-session';
import { groupInventory } from '@/lib/filament';
import { getPropertiesForMaterials } from '@/lib/material-properties';
import { parseConstraints } from '@/lib/property-filter';
import { getSharedFilaments } from '@/lib/sharing';
import { getMaterialUsage } from '@/lib/usage-stats';

export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const str = (v: string | string[] | undefined) =>
    typeof v === 'string' ? v : '';
  const minLeftParsed = Number.parseInt(str(params.minLeft), 10);
  const initialTab = str(params.tab) || 'stock';
  const statusParam = str(params.status);
  const status = (
    ['empty', 'all'].includes(statusParam) ? statusParam : 'in-stock'
  ) as 'in-stock' | 'empty' | 'all';
  const initialFilters = {
    q: str(params.q),
    status,
    filamentType: str(params.type) || null,
    minLeftGrams: Number.isNaN(minLeftParsed) ? null : minLeftParsed,
    hideLent: str(params.hideLent) === '1',
    propertyConstraints: parseConstraints(str(params.props)),
  };
  const [
    rows,
    spoolTypes,
    activeLends,
    myGroups,
    unreadCount,
    myLends,
    propertyDefinitions,
    materialUsage,
  ] = await Promise.all([
    getInventory(),
    getUsableSpoolTypes(),
    getActiveLendsForOwner(),
    getMyGroups(),
    getUnreadCount(),
    getMyLends(),
    getPropertyDefinitions(),
    getMaterialUsage(user.id),
  ]);
  const groups = await Promise.all(
    myGroups.map(async ({ group }) => ({
      id: group.id,
      name: group.name,
      stock: await getSharedFilaments(group.id),
    }))
  );
  const lentToBySpoolId = new Map(
    activeLends.map((l) => [l.spoolId, l.borrowerName])
  );
  const inventory = groupInventory(rows, lentToBySpoolId);
  const propertiesByMaterialId = await getPropertiesForMaterials(
    inventory.map((m) => m.material.id)
  );
  return (
    <WarehouseDashboard
      inventory={inventory}
      spoolTypes={spoolTypes}
      groups={groups}
      myLends={myLends}
      unreadCount={unreadCount}
      user={{ id: user.id, name: user.name, isAdmin: user.role === 'admin' }}
      initialTab={initialTab}
      initialFilters={initialFilters}
      propertiesByMaterialId={propertiesByMaterialId}
      materialUsage={materialUsage}
      propertyDefinitions={propertyDefinitions}
    />
  );
}
