import { MaterialCatalog } from '@/components/catalog/material-catalog';
import { PageShell } from '@/components/layout/page-shell';
import { RequestMaterialForm } from '@/components/catalog/request-material-form';
import { countUsableMaterials, searchMaterials } from '@/app/actions/materials';
import { getPropertyDefinitions } from '@/app/actions/properties';
import { requireUser } from '@/lib/auth-session';
import { parseMaterialCatalogParams } from '@/lib/catalog-params';
import { getPropertiesForMaterials } from '@/lib/material-properties';

export const dynamic = 'force-dynamic';

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const isAdmin = user.role === 'admin';
  const filters = parseMaterialCatalogParams(await searchParams);

  // Only a page of rows is fetched, and datasheet values only for those — the
  // catalog reaches tens of thousands of materials after a SpoolmanDB import.
  const [result, grandTotal, propertyDefinitions] = await Promise.all([
    searchMaterials({ ...filters, status: null, limit: 150 }),
    countUsableMaterials(),
    getPropertyDefinitions(),
  ]);
  const propertiesByMaterialId = await getPropertiesForMaterials(
    result.materials.map((m) => m.id)
  );

  return (
    <PageShell
      title="Materials"
      description={
        isAdmin
          ? "Global material catalog. Missing one? Add it below — as an admin it's published straight away."
          : 'Global material catalog. Missing one? Request it below — you can use it immediately while an admin reviews it.'
      }
    >
      <MaterialCatalog
        materials={result.materials}
        total={result.total}
        grandTotal={grandTotal}
        filters={filters}
        currentUserId={user.id}
        propertiesByMaterialId={propertiesByMaterialId}
        propertyDefinitions={propertyDefinitions}
      />

      <section className="border-border bg-card mt-6 rounded-lg border p-6">
        <h2 className="font-semibold">
          {isAdmin ? 'Add a new material' : 'Request a new material'}
        </h2>
        <RequestMaterialForm isAdmin={isAdmin} />
      </section>
    </PageShell>
  );
}
