import { matchesTokens, searchTokens } from '@/lib/search';
import type { SharedSpool } from '@/lib/sharing';

// Pure shaping for the group page's Stock view. Which spools are in the stock
// at all is decided by getSharedFilaments(); this only groups and narrows it.

export type GroupStockFilters = {
  /** Token search over manufacturer, material name and type. */
  q: string;
  /** null = all types. */
  filamentType: string | null;
  /** null = all members. */
  ownerId: string | null;
  hideLent: boolean;
};

export type StockMaterial = {
  material: SharedSpool['material'];
  /** Your own spools first, then by owner name. */
  spools: SharedSpool[];
  totalLeftGrams: number;
};

export function filterStock(
  stock: SharedSpool[],
  filters: GroupStockFilters
): SharedSpool[] {
  const tokens = searchTokens(filters.q);
  return stock.filter(
    (s) =>
      matchesTokens(
        tokens,
        s.material.manufacturer,
        s.material.name,
        s.material.filamentType
      ) &&
      (!filters.filamentType ||
        s.material.filamentType === filters.filamentType) &&
      (!filters.ownerId || s.ownerId === filters.ownerId) &&
      !(filters.hideLent && s.lentTo)
  );
}

export function groupStockByMaterial(
  stock: SharedSpool[],
  currentUserId: string
): StockMaterial[] {
  const byMaterial = new Map<string, StockMaterial>();
  for (const s of stock) {
    const entry = byMaterial.get(s.material.id) ?? {
      material: s.material,
      spools: [],
      totalLeftGrams: 0,
    };
    entry.spools.push(s);
    entry.totalLeftGrams += s.filamentLeftGrams;
    byMaterial.set(s.material.id, entry);
  }
  const rank = (s: SharedSpool) => (s.ownerId === currentUserId ? 0 : 1);
  const groups = [...byMaterial.values()];
  for (const g of groups)
    g.spools.sort(
      (a, b) => rank(a) - rank(b) || a.ownerName.localeCompare(b.ownerName)
    );
  return groups.sort((a, b) => a.material.name.localeCompare(b.material.name));
}

/** Shared spools per owner id (members sharing nothing are absent). */
export function shareCountsByOwner(stock: SharedSpool[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const s of stock)
    counts.set(s.ownerId, (counts.get(s.ownerId) ?? 0) + 1);
  return counts;
}
