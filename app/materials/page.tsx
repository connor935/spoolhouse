import { MaterialCatalog } from '@/components/catalog/material-catalog';
import { PageShell } from '@/components/layout/page-shell';
import { RequestMaterialForm } from '@/components/catalog/request-material-form';
import { getMaterialCatalog } from '@/app/actions/materials';
import { getPropertyDefinitions } from '@/app/actions/properties';
import { requireUser } from '@/lib/auth-session';
import { getPropertiesForMaterials } from '@/lib/material-properties';

export const dynamic = 'force-dynamic';

export default async function MaterialsPage() {
  const user = await requireUser();
  const isAdmin = user.role === 'admin';
  const [catalog, propertyDefinitions] = await Promise.all([
    getMaterialCatalog(),
    getPropertyDefinitions(),
  ]);
  const propertiesByMaterialId = await getPropertiesForMaterials(
    catalog.map((m) => m.id)
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
        materials={catalog}
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
