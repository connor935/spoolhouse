import Link from 'next/link';
import { MaterialCatalog } from '@/components/catalog/material-catalog';
import { PageShell } from '@/components/layout/page-shell';
import { searchMaterialsForAdmin } from '@/app/actions/materials';
import { getPropertyDefinitions } from '@/app/actions/properties';
import { requireAdmin } from '@/lib/auth-session';
import { parseMaterialCatalogParams } from '@/lib/catalog-params';
import { getPropertiesForMaterials } from '@/lib/material-properties';

export const dynamic = 'force-dynamic';

export default async function AdminMaterialsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdmin();
  const filters = parseMaterialCatalogParams(await searchParams);

  const [result, propertyDefinitions] = await Promise.all([
    searchMaterialsForAdmin({ ...filters, limit: 150 }),
    getPropertyDefinitions(),
  ]);
  const propertiesByMaterialId = await getPropertiesForMaterials(
    result.materials.map((m) => m.id)
  );

  return (
    <PageShell
      title="Manage materials"
      description={
        <>
          Search the full catalog, approve/reject submissions, edit or delete
          any entry. Use the status filter (or “Review pending”) to see the
          queue. The read-only view is on{' '}
          <Link href="/materials" className="hover:text-foreground underline">
            the materials page
          </Link>
          .
        </>
      }
    >
      <MaterialCatalog
        materials={result.materials}
        total={result.total}
        grandTotal={result.grandTotal}
        pendingCount={result.pendingCount}
        filters={filters}
        currentUserId={admin.id}
        isAdmin
        propertiesByMaterialId={propertiesByMaterialId}
        propertyDefinitions={propertyDefinitions}
      />
    </PageShell>
  );
}
