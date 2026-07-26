import type { MaterialCatalogFilters } from '@/components/catalog/material-catalog';
import { parseConstraints } from '@/lib/property-filter';

// The material catalog's filters live in the URL so the server can resolve them
// in SQL — shared by /materials and /admin/materials, which read the same
// params (`status` is only meaningful on the admin page).
export function parseMaterialCatalogParams(
  params: Record<string, string | string[] | undefined>
): MaterialCatalogFilters {
  const str = (v: string | string[] | undefined) =>
    typeof v === 'string' ? v : '';
  return {
    q: str(params.q),
    filamentType: str(params.type) || null,
    status: str(params.status) || null,
    constraints: parseConstraints(str(params.props)),
  };
}
