import { getSpoolTypeCatalog } from '@/app/actions/spool-types';
import { SpoolTypeCatalogContainer } from '@/components/catalog/spool-type-catalog-view';
import { requireUser } from '@/lib/auth-session';

export const dynamic = 'force-dynamic';

export default async function SpoolTypesPage() {
  const user = await requireUser();
  const spoolTypes = await getSpoolTypeCatalog();

  return (
    <SpoolTypeCatalogContainer
      spoolTypes={spoolTypes}
      viewerId={user.id}
      autoApprove={user.role === 'admin' || user.trustedContributor === true}
    />
  );
}
