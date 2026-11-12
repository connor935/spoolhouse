import { getUpstreamManufacturers } from '@/app/actions/spoolmandb';
import { ImportContainer } from '@/components/admin/import-view';
import { requireAdmin } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export default async function AdminImportPage() {
  await requireAdmin();
  const manufacturers = await getUpstreamManufacturers();
  return <ImportContainer manufacturers={manufacturers} />;
}
