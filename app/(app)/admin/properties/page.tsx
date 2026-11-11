import { getPropertyDefinitionsForAdmin } from '@/app/actions/properties';
import { PropertiesContainer } from '@/components/admin/properties-view';
import { requireAdmin } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export default async function AdminPropertiesPage() {
  await requireAdmin();
  const properties = await getPropertyDefinitionsForAdmin();
  return <PropertiesContainer properties={properties} />;
}
