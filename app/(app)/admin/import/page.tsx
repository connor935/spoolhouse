import { getUpstreamManufacturers } from '@/app/actions/spoolmandb';
import { ImportContainer } from '@/components/admin/import-view';
import { requireAdmin } from '@/lib/auth-session';
import { spoolmandbSource } from '@/lib/spoolmandb-source';

export const dynamic = 'force-dynamic';

export default async function AdminImportPage() {
  await requireAdmin();
  const manufacturers = await getUpstreamManufacturers();
  return (
    <ImportContainer
      sourceUrl={spoolmandbSource().repoUrl}
      manufacturers={manufacturers}
    />
  );
}
