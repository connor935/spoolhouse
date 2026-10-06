import type { Material, Spool, SpoolType } from '@/lib/db/schema';

// One physical spool with computed amounts (material fields live on MaterialInventory)
export type SpoolView = {
  id: string;
  materialId: string;
  spoolTypeId: string;
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
  pricePaidCents: number | null;
  // Cents per gram of filament, from the price and the nominal full weight
  pricePerGramCents: number | null;
  // Value of the filament still on the spool (cents), null when unpriced
  valueLeftCents: number | null;
  purchasedAt: string | null;
  location: string | null;
  lastDriedAt: Date | null;
  // Hygroscopic type and not dried within its interval (see DRYING_INTERVAL_DAYS)
  needsDrying: boolean;
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

// Hygroscopic filament types and how many days after opening/drying a spool
// gets the "dry?" hint. Types not listed never get it.
export const DRYING_INTERVAL_DAYS: Record<string, number> = {
  Nylon: 14,
  PVA: 14,
  TPU: 30,
  PC: 30,
  PETG: 60,
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Measured from the last drying, or from when the spool was registered (taken
// as "opened") if it was never dried.
export function needsDrying(
  filamentType: string,
  lastDriedAt: Date | null,
  createdAt: Date,
  now: Date = new Date()
): boolean {
  const interval = DRYING_INTERVAL_DAYS[filamentType];
  if (interval === undefined) return false;
  const since = (lastDriedAt ?? createdAt).getTime();
  return now.getTime() - since > interval * DAY_MS;
}

export function pricePerGramCents(
  s: Pick<Spool, 'pricePaidCents' | 'fullFilamentWeightGrams'>
): number | null {
  if (s.pricePaidCents == null || s.fullFilamentWeightGrams <= 0) return null;
  return s.pricePaidCents / s.fullFilamentWeightGrams;
}

// Prices are stored in cents of this one currency. Fixed locale so the server
// render and the client agree on the formatting.
export const CURRENCY = 'EUR';
const moneyFormat = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: CURRENCY,
});

export function formatMoney(cents: number): string {
  return moneyFormat.format(cents / 100);
}

// Price input as typed ("19.99", "19,99", "€ 20") -> cents. Empty -> null
// (no price); anything else unreadable -> undefined (reject).
export function parsePriceCents(input: string): number | null | undefined {
  const t = input.replace(/[€\s]/g, '').replace(',', '.');
  if (t === '') return null;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return undefined;
  return Math.round(Number(t) * 100);
}

// cents -> the form's input value ("19.99"), '' for no price
export function priceInputValue(cents: number | null): string {
  return cents === null ? '' : (cents / 100).toFixed(2);
}

// What a borrower used during a lend: the weight at approval minus the weight
// at return (or now, while still active). Null for lends approved before
// weights were snapshotted. Never negative (a re-weigh may correct upwards).
export function lendUsageGrams(lend: {
  startWeightGrams: number | null;
  endWeightGrams: number | null;
  currentWeightGrams: number;
}): number | null {
  if (lend.startWeightGrams === null) return null;
  const end = lend.endWeightGrams ?? lend.currentWeightGrams;
  return Math.max(0, lend.startWeightGrams - end);
}

// filamentType is the spool's material type — needed for the drying hint;
// callers without the material (none currently) get needsDrying = false.
export function toSpoolView(
  s: Spool,
  spoolType: SpoolType,
  filamentType?: string
): SpoolView {
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
  const perGram = pricePerGramCents(s);

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
    pricePaidCents: s.pricePaidCents,
    pricePerGramCents: perGram,
    valueLeftCents: perGram === null ? null : perGram * filamentLeftGrams,
    purchasedAt: s.purchasedAt,
    location: s.location,
    lastDriedAt: s.lastDriedAt,
    needsDrying:
      !isEmpty &&
      filamentType !== undefined &&
      needsDrying(filamentType, s.lastDriedAt, s.createdAt),
    createdAt: s.createdAt,
  };
}

// Groups inventory rows (spool + material + spool type) by material,
// spools oldest-first (stable #1, #2 … numbering).
export function groupInventory(
  rows: { spool: Spool; material: Material; spoolType: SpoolType }[],
  lentToBySpoolId?: Map<string, string>
): MaterialInventory[] {
  const byMaterial = new Map<string, MaterialInventory>();
  for (const row of rows) {
    const view = toSpoolView(
      row.spool,
      row.spoolType,
      row.material.filamentType
    );
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

// Swatch color for materials without a `color` set.
export const DEFAULT_MATERIAL_COLOR = '#94a3b8';
