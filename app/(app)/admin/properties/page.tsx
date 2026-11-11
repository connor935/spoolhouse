import { PageShell } from '@/components/layout/page-shell';
import { PropertyAdminList } from '@/components/admin/property-admin-list';
import { getPropertyDefinitionsForAdmin } from '@/app/actions/properties';
import { requireAdmin } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export default async function AdminPropertiesPage() {
  await requireAdmin();
  const properties = await getPropertyDefinitionsForAdmin();

  return (
    <PageShell
      title="Properties"
      description="Datasheet property definitions shown on materials (tensile strength, hardness, glass-transition temp, …). Any member can fill in a material's values; admins verify them."
    >
      <PropertyAdminList properties={properties} />
    </PageShell>
  );
}
