import Link from 'next/link';
import { MaterialCatalog } from '@/components/material-catalog';
import { PageShell } from '@/components/page-shell';
import { getAllMaterialsForAdmin } from '@/app/actions/materials';
import { getPropertyDefinitions } from '@/app/actions/properties';
import { requireAdmin } from '@/lib/auth-session';
import { getPropertiesForMaterials } from '@/lib/material-properties';

export const dynamic = 'force-dynamic';

export default async function AdminMaterialsPage() {
  const admin = await requireAdmin();
  const [materials, propertyDefinitions] = await Promise.all([
    getAllMaterialsForAdmin(),
    getPropertyDefinitions(),
  ]);
  const propertiesByMaterialId = await getPropertiesForMaterials(
    materials.map((m) => m.id)
  );

  return (
    <PageShell
      title="Manage materials"
      description={
        <>
          Search the full catalog, approve/reject submissions, edit or delete any
          entry. Use the status filter (or “Review pending”) to see the queue. The
          read-only view is on{' '}
          <Link href="/materials" className="hover:text-foreground underline">
            the materials page
          </Link>
          .
        </>
      }
    >
      <MaterialCatalog
        materials={materials}
        currentUserId={admin.id}
        isAdmin
        propertiesByMaterialId={propertiesByMaterialId}
        propertyDefinitions={propertyDefinitions}
      />
    </PageShell>
  );
}
