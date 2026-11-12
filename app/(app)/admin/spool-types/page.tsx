import { getSpoolTypesForAdmin } from '@/app/actions/spool-types';
import { AdminSpoolTypesContainer } from '@/components/catalog/admin-catalog-view';
import { requireAdmin } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export default async function AdminSpoolTypesPage() {
  await requireAdmin();
  const spoolTypes = await getSpoolTypesForAdmin();
  return <AdminSpoolTypesContainer spoolTypes={spoolTypes} now={new Date()} />;
}
