import type { MaterialInventory, SpoolView } from '@/lib/filament';
import type { FilterValue } from '@/lib/filter-value';
import type { InventoryQuery } from '@/lib/inventory-params';
import type { MaterialPropertyView } from '@/lib/material-properties';
import { materialMatchesConstraints } from '@/lib/property-filter';
import { matchesTokens, searchTokens } from '@/lib/search';

// Property values keyed by material id, for the datasheet-property range filter.
type PropsByMaterial = Record<string, MaterialPropertyView[]>;

// The search + filter fields, without /inventory's stock status.
type SearchFilters = FilterValue & { q: string };

// Pure filtering helpers for the search/filter bar, shared by /inventory
// (per material) and group stock.

function materialMatches(
  m: { id: string; name: string; manufacturer: string; filamentType: string },
  f: SearchFilters,
  propsByMaterial: PropsByMaterial,
  // Spool-level text the search should also find (its storage location)
  ...extra: (string | null | undefined)[]
): boolean {
  if (f.filamentTypes.length > 0 && !f.filamentTypes.includes(m.filamentType))
    return false;
  if (
    !materialMatchesConstraints(
      propsByMaterial[m.id] ?? [],
      f.propertyConstraints
    )
  )
    return false;
  return matchesTokens(
    searchTokens(f.q.trim()),
    m.manufacturer,
    m.name,
    m.filamentType,
    ...extra
  );
}

function spoolMatchesStatus(s: SpoolView, query: InventoryQuery): boolean {
  if (query.status === 'in-stock' && s.isEmpty) return false;
  if (query.status === 'empty' && !s.isEmpty) return false;
  if (query.minLeftGrams !== null && s.filamentLeftGrams < query.minLeftGrams)
    return false;
  return true;
}

// Which spools are visible on /inventory (per material), combined with the
// stock status toggle + search/filter bar.
export function visibleMaterialEntries(
  inventory: MaterialInventory[],
  query: InventoryQuery,
  propsByMaterial: PropsByMaterial
) {
  // Matched per spool, so searching a location ("dry box") narrows a
  // material to the spools stored there.
  return inventory
    .map((m) => ({
      inventory: m,
      visibleIds: new Set(
        m.spools
          .filter(
            (s) =>
              spoolMatchesStatus(s, query) &&
              materialMatches(m.material, query, propsByMaterial, s.location)
          )
          .map((s) => s.id)
      ),
    }))
    .filter((entry) => entry.visibleIds.size > 0);
}

export type StatusCounts = { inStock: number; empty: number; all: number };

// Counts on the In stock / Empty / All toggle (unfiltered).
export function statusCounts(inventory: MaterialInventory[]): StatusCounts {
  const spools = inventory.flatMap((m) => m.spools);
  const empty = spools.filter((s) => s.isEmpty).length;
  return { inStock: spools.length - empty, empty, all: spools.length };
}
