import type { MaterialInventory, SpoolView } from '@/lib/filament';
import type { MaterialPropertyView } from '@/lib/material-properties';
import { materialMatchesConstraints } from '@/lib/property-filter';
import type { SharedSpool } from '@/lib/sharing';
import type { InventoryFilters } from '@/components/inventory-filter';

// Property values keyed by material id, for the datasheet-property range filter.
type PropsByMaterial = Record<string, MaterialPropertyView[]>;

// Pure filtering helpers for the dashboard's search/filter bar, shared by the
// "Your stock" (per-material) and group-stock views.

export function materialMatches(
  m: { id: string; name: string; manufacturer: string; filamentType: string },
  f: InventoryFilters,
  propsByMaterial: PropsByMaterial
): boolean {
  if (f.filamentType && m.filamentType !== f.filamentType) return false;
  if (
    !materialMatchesConstraints(
      propsByMaterial[m.id] ?? [],
      f.propertyConstraints
    )
  )
    return false;
  const q = f.q.trim().toLowerCase();
  if (q === '') return true;
  return (
    m.name.toLowerCase().includes(q) || m.manufacturer.toLowerCase().includes(q)
  );
}

function spoolMatchesStatus(s: SpoolView, filters: InventoryFilters): boolean {
  if (filters.status === 'in-stock' && s.isEmpty) return false;
  if (filters.status === 'empty' && !s.isEmpty) return false;
  if (
    filters.minLeftGrams !== null &&
    s.filamentLeftGrams < filters.minLeftGrams
  )
    return false;
  return true;
}

// Which spools are visible in "Your stock" (per material), combined with the
// status selector + search/filter bar.
export function visibleMaterialEntries(
  inventory: MaterialInventory[],
  filters: InventoryFilters,
  propsByMaterial: PropsByMaterial
) {
  return inventory
    .filter((m) => materialMatches(m.material, filters, propsByMaterial))
    .map((m) => ({
      inventory: m,
      visibleIds: new Set(
        m.spools.filter((s) => spoolMatchesStatus(s, filters)).map((s) => s.id)
      ),
    }))
    .filter((entry) => entry.visibleIds.size > 0);
}

// Group stock filtered by the same bar (+ hide-lent).
export function filterGroupStock(
  stock: SharedSpool[],
  filters: InventoryFilters,
  propsByMaterial: PropsByMaterial
): SharedSpool[] {
  return stock.filter((s) => {
    if (!materialMatches(s.material, filters, propsByMaterial)) return false;
    if (
      filters.minLeftGrams !== null &&
      s.filamentLeftGrams < filters.minLeftGrams
    )
      return false;
    if (filters.hideLent && s.lentTo) return false;
    return true;
  });
}
