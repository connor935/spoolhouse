import {
  parseConstraints,
  serializeConstraints,
  type PropertyConstraint,
} from '@/lib/property-filter';

// Filters of the material catalog, resolved in SQL (lib/material-search.ts).
export type MaterialCatalogFilters = {
  q: string;
  filamentTypes: string[];
  /** Admin pages only: exact review status. */
  status: string | null;
  constraints: PropertyConstraint[];
};

// The material catalog's filters live in the URL so the server can resolve them
// in SQL — shared by /materials and /admin/materials, which read the same
// params (`status` is only meaningful on the admin page). `type` is a comma
// list; a single type (older links) parses the same way.
export function parseMaterialCatalogParams(
  params: Record<string, string | string[] | undefined>
): MaterialCatalogFilters {
  const str = (v: string | string[] | undefined) =>
    typeof v === 'string' ? v : '';
  return {
    q: str(params.q),
    filamentTypes: str(params.type)
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    status: str(params.status) || null,
    constraints: parseConstraints(str(params.props)),
  };
}

/** Query string for the filters, without the leading "?"; "" when none are set. */
export function materialCatalogSearch(filters: MaterialCatalogFilters): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set('q', filters.q.trim());
  if (filters.filamentTypes.length)
    params.set('type', filters.filamentTypes.join(','));
  if (filters.status) params.set('status', filters.status);
  const props = serializeConstraints(filters.constraints);
  if (props) params.set('props', props);
  return params.toString();
}
