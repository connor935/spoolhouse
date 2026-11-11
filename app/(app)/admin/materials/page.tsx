import { searchMaterialsForAdmin } from '@/app/actions/materials';
import { AdminMaterialsContainer } from '@/components/catalog/admin-catalog-view';
import { requireAdmin } from '@/lib/auth-session';
import { parseMaterialCatalogParams } from '@/lib/catalog-params';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 150;
const STATUSES = new Set(['approved', 'pending', 'rejected']);

export default async function AdminMaterialsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const parsed = parseMaterialCatalogParams(await searchParams);
  // An unknown ?status= falls back to "all" instead of failing validation.
  const filters = {
    ...parsed,
    status: parsed.status && STATUSES.has(parsed.status) ? parsed.status : null,
  };
  const result = await searchMaterialsForAdmin({
    q: filters.q,
    filamentTypes: filters.filamentTypes,
    constraints: filters.constraints,
    status: filters.status,
    limit: PAGE_SIZE,
  });

  return (
    <AdminMaterialsContainer
      filters={filters}
      firstPage={{ rows: result.rows, total: result.total }}
      statusCounts={result.statusCounts}
      now={new Date()}
    />
  );
}
