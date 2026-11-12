import { getInventory } from '@/app/actions/filaments';
import { getActiveLendsForOwner, getMyLends } from '@/app/actions/lends';
import { getPropertyDefinitions } from '@/app/actions/properties';
import { getUsableSpoolTypes } from '@/app/actions/spool-types';
import { InventoryPage } from '@/components/inventory/inventory-page';
import { requireUser } from '@/lib/auth-session';
import { forecastDays } from '@/lib/consumption';
import { groupInventory } from '@/lib/filament';
import { parseInventoryParams } from '@/lib/inventory-params';
import { getPropertiesForMaterials } from '@/lib/material-properties';
import { getMaterialUsage } from '@/lib/usage-stats';

export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const initialQuery = parseInventoryParams(await searchParams);
  const [rows, spoolTypes, activeLends, myLends, definitions, usage] =
    await Promise.all([
      getInventory(),
      getUsableSpoolTypes(),
      getActiveLendsForOwner(),
      getMyLends(),
      getPropertyDefinitions(),
      getMaterialUsage(user.id),
    ]);
  const inventory = groupInventory(
    rows,
    new Map(activeLends.map((l) => [l.spoolId, l.borrowerName]))
  );
  const propertiesByMaterialId = await getPropertiesForMaterials(
    inventory.map((m) => m.material.id)
  );

  const forecastDaysByMaterial = Object.fromEntries(
    inventory.map((m) => [
      m.material.id,
      forecastDays(m.totalLeftGrams, usage[m.material.id]?.gramsPerDay ?? 0),
    ])
  );
  // Open requests on the user's own spools ("Req · Anna" on the tile).
  const requestedBy = Object.fromEntries(
    myLends
      .filter((l) => l.lend.status === 'requested' && l.ownerId === user.id)
      .map((l) => [l.lend.filamentId, l.borrowerName])
  );
  // Kept off SpoolView: group stock spreads the view to other members.
  const tagUidBySpoolId = Object.fromEntries(
    rows.flatMap(({ spool }) =>
      spool.tagUid ? [[spool.id, spool.tagUid]] : []
    )
  );

  return (
    <InventoryPage
      inventory={inventory}
      initialQuery={initialQuery}
      spoolTypes={spoolTypes}
      properties={definitions}
      propertiesByMaterialId={propertiesByMaterialId}
      forecastDaysByMaterial={forecastDaysByMaterial}
      requestedBy={requestedBy}
      tagUidBySpoolId={tagUidBySpoolId}
      isAdmin={user.role === 'admin'}
    />
  );
}
