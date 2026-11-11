import { notFound } from 'next/navigation';

import { getInventory } from '@/app/actions/filaments';
import { getActiveLendsForOwner } from '@/app/actions/lends';
import { getPropertyDefinitions } from '@/app/actions/properties';
import { getUsableSpoolTypes } from '@/app/actions/spool-types';
import type { Crumb } from '@/components/common/page-header';
import { MaterialDetailContainer } from '@/components/materials/material-detail';
import { requireUser } from '@/lib/auth-session';
import { groupInventory, materialStockSummary } from '@/lib/filament';
import {
  getMaterialGroupStock,
  getVisibleMaterial,
} from '@/lib/material-detail';
import { getPropertiesForMaterials } from '@/lib/material-properties';
import { getMaterialUsageHistory } from '@/lib/usage-stats';

export const dynamic = 'force-dynamic';

// Where the viewer came from, for the breadcrumb (?from=…). Anything else
// falls back to the catalog.
const ORIGINS: Record<string, Crumb[]> = {
  inventory: [{ label: 'Inventory', href: '/inventory' }],
  admin: [{ label: 'Manage materials', href: '/admin/materials' }],
  review: [{ label: 'Review queue', href: '/admin/materials/review' }],
};

export default async function MaterialPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const [{ id }, query] = await Promise.all([params, searchParams]);

  // Visibility lives in the query: approved, the viewer's own, or any for admins.
  const record = await getVisibleMaterial(id, user);
  if (!record) notFound();

  const [
    rows,
    activeLends,
    usage,
    propertiesById,
    definitions,
    groupStock,
    spoolTypes,
  ] = await Promise.all([
    getInventory(),
    getActiveLendsForOwner(),
    getMaterialUsageHistory(user.id, id),
    getPropertiesForMaterials([id]),
    getPropertyDefinitions(),
    getMaterialGroupStock(id, user.id),
    getUsableSpoolTypes(),
  ]);
  const inventory = groupInventory(
    rows,
    new Map(activeLends.map((l) => [l.spoolId, l.borrowerName]))
  );
  const spools = inventory.find((m) => m.material.id === id)?.spools ?? [];
  const locations = [
    ...new Set(
      inventory.flatMap((m) => m.spools.flatMap((s) => s.location ?? []))
    ),
  ].sort((a, b) => a.localeCompare(b));
  // Kept off SpoolView, as on /inventory: the spool editor shows it read-only.
  const tagUidBySpoolId = Object.fromEntries(
    rows.flatMap(({ spool }) =>
      spool.materialId === id && spool.tagUid ? [[spool.id, spool.tagUid]] : []
    )
  );
  const from = typeof query.from === 'string' ? query.from : '';

  return (
    <MaterialDetailContainer
      material={record.material}
      breadcrumb={Object.hasOwn(ORIGINS, from) ? ORIGINS[from] : undefined}
      viewer={{ id: user.id, isAdmin: user.role === 'admin' }}
      spoolCount={record.spoolCount}
      spools={spools}
      summary={materialStockSummary(spools)}
      usage={usage}
      propertyValues={propertiesById[id] ?? []}
      propertyDefinitions={definitions}
      groupStock={groupStock}
      spoolTypes={spoolTypes}
      locations={locations}
      tagUidBySpoolId={tagUidBySpoolId}
    />
  );
}
