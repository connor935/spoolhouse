import type { Material, Spool, SpoolType } from '@/lib/db/schema';

// One physical spool with computed amounts (material fields live on MaterialInventory)
export type SpoolView = {
  id: number;
  materialId: number;
  spoolTypeId: number;
  // e.g. "Prusament — Standard (216 g)"
  spoolTypeLabel: string;
  // Weight of the bare, empty spool (g), from the spool type
  emptyWeightGrams: number;
  fullFilamentWeightGrams: number;
  measuredTotalWeightGrams: number;
  // Computed: how much filament is actually left on the spool (g)
  filamentLeftGrams: number;
  percentLeft: number;
  isEmpty: boolean;
  isLow: boolean;
  // Name of the current borrower, if this spool has an active lend
  lentToName: string | null;
  createdAt: Date;
};

// A material with all of the user's spools of it
export type MaterialInventory = {
  material: Material;
  spools: SpoolView[];
  totalLeftGrams: number;
};

const EMPTY_THRESHOLD_G = 5; // 5 g or less counts as empty
const LOW_THRESHOLD_PCT = 15;

// Filament left = measured total weight on the scale minus the empty spool weight.
export function computeFilamentLeft(
  measuredTotalGrams: number,
  emptyWeightGrams: number
): number {
  return Math.max(0, measuredTotalGrams - emptyWeightGrams);
}

export function spoolTypeLabel(
  st: Pick<SpoolType, 'manufacturer' | 'name' | 'emptyWeightGrams'>
): string {
  return `${st.manufacturer} — ${st.name} (${st.emptyWeightGrams} g)`;
}

export function materialLabel(
  m: Pick<Material, 'manufacturer' | 'name' | 'filamentType'>
): string {
  return `${m.manufacturer} — ${m.name} (${m.filamentType})`;
}

export function toSpoolView(s: Spool, spoolType: SpoolType): SpoolView {
  const emptyWeightGrams = spoolType.emptyWeightGrams;
  const filamentLeftGrams = computeFilamentLeft(
    s.measuredTotalWeightGrams,
    emptyWeightGrams
  );
  const percentLeft =
    s.fullFilamentWeightGrams > 0
      ? Math.min(
          100,
          Math.max(0, (filamentLeftGrams / s.fullFilamentWeightGrams) * 100)
        )
      : 0;
  const isEmpty = filamentLeftGrams <= EMPTY_THRESHOLD_G;

  return {
    id: s.id,
    materialId: s.materialId,
    spoolTypeId: s.spoolTypeId,
    spoolTypeLabel: spoolTypeLabel(spoolType),
    emptyWeightGrams,
    fullFilamentWeightGrams: s.fullFilamentWeightGrams,
    measuredTotalWeightGrams: s.measuredTotalWeightGrams,
    filamentLeftGrams,
    percentLeft,
    isEmpty,
    isLow: !isEmpty && percentLeft <= LOW_THRESHOLD_PCT,
    lentToName: null,
    createdAt: s.createdAt,
  };
}

// Groups inventory rows (spool + material + spool type) by material,
// spools oldest-first (stable #1, #2 … numbering).
export function groupInventory(
  rows: { spool: Spool; material: Material; spoolType: SpoolType }[],
  lentToBySpoolId?: Map<number, string>
): MaterialInventory[] {
  const byMaterial = new Map<number, MaterialInventory>();
  for (const row of rows) {
    const view = toSpoolView(row.spool, row.spoolType);
    view.lentToName = lentToBySpoolId?.get(row.spool.id) ?? null;
    const entry = byMaterial.get(row.material.id) ?? {
      material: row.material,
      spools: [],
      totalLeftGrams: 0,
    };
    entry.spools.push(view);
    entry.totalLeftGrams += view.filamentLeftGrams;
    byMaterial.set(row.material.id, entry);
  }
  const result = [...byMaterial.values()];
  for (const entry of result) {
    entry.spools.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
  // Newest material first (matches previous newest-spool-first feel)
  result.sort(
    (a, b) => b.material.createdAt.getTime() - a.material.createdAt.getTime()
  );
  return result;
}

export function formatWeight(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(2)} kg`;
  return `${Math.round(grams)} g`;
}

export const FILAMENT_TYPES = [
  'PLA',
  'PETG',
  'ABS',
  'ASA',
  'TPU',
  'Nylon',
  'PC',
  'PVA',
  'HIPS',
  'Other',
];
