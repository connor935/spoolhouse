// Shared story/test fixtures for the inventory surface, matching the
// Inventory / MaterialDetail / Reweigh design boards. Built with the real
// domain helpers so the numbers (left, percent, low, empty) stay consistent.
import type { Material, Spool, SpoolType } from '@/lib/db/schema';
import {
  groupInventory,
  needsDrying,
  type MaterialInventory,
  type SpoolView,
} from '@/lib/filament';

/** "Today" for every fixture, so drying hints and "2 weeks ago" are stable. */
export const FIXTURE_NOW = new Date('2026-11-10T12:00:00Z');

export const daysAgo = (days: number) =>
  new Date(FIXTURE_NOW.getTime() - days * 24 * 60 * 60 * 1000);

function material(
  id: string,
  fields: Pick<Material, 'manufacturer' | 'name' | 'filamentType' | 'color'>,
  createdDaysAgo: number
): Material {
  return {
    id,
    status: 'approved',
    submittedById: null,
    reviewedById: null,
    externalKey: null,
    createdAt: daysAgo(createdDaysAgo),
    updatedAt: daysAgo(createdDaysAgo),
    ...fields,
  } as Material;
}

function spoolType(
  id: string,
  fields: Pick<SpoolType, 'manufacturer' | 'name' | 'emptyWeightGrams'>
): SpoolType {
  return {
    id,
    status: 'approved',
    submittedById: null,
    reviewedById: null,
    externalKey: null,
    createdAt: daysAgo(400),
    updatedAt: daysAgo(400),
    ...fields,
  } as SpoolType;
}

export const materials = {
  galaxyBlack: material(
    'mat-galaxy-black',
    {
      manufacturer: 'Prusament',
      name: 'Galaxy Black',
      filamentType: 'PLA',
      color: '#22242A',
    },
    300
  ),
  prusaOrange: material(
    'mat-prusa-orange',
    {
      manufacturer: 'Prusament',
      name: 'Prusa Orange',
      filamentType: 'PETG',
      color: '#F26B21',
    },
    200
  ),
  fireEngineRed: material(
    'mat-fire-engine-red',
    {
      manufacturer: 'eSun',
      name: 'Fire Engine Red',
      filamentType: 'PETG',
      color: '#C8102E',
    },
    150
  ),
  basicCyan: material(
    'mat-basic-cyan',
    {
      manufacturer: 'Bambu Lab',
      name: 'Basic Cyan',
      filamentType: 'PLA',
      color: '#0086D6',
    },
    100
  ),
};

export const spoolTypes = {
  prusamentCardboard: spoolType('st-prusament-cardboard', {
    manufacturer: 'Prusament',
    name: 'Cardboard 1 kg',
    emptyWeightGrams: 193,
  }),
  esunPlastic: spoolType('st-esun-plastic', {
    manufacturer: 'eSun',
    name: 'Plastic 1 kg',
    emptyWeightGrams: 224,
  }),
  bambuReusable: spoolType('st-bambu-reusable', {
    manufacturer: 'Bambu Lab',
    name: 'Reusable 1 kg',
    emptyWeightGrams: 250,
  }),
};

type SpoolFields = Partial<Spool> &
  Pick<Spool, 'id' | 'measuredTotalWeightGrams'>;

function row(
  m: Material,
  st: SpoolType,
  createdDaysAgo: number,
  fields: SpoolFields
): { spool: Spool; material: Material; spoolType: SpoolType } {
  return {
    material: m,
    spoolType: st,
    spool: {
      userId: 'user-anna',
      materialId: m.id,
      spoolTypeId: st.id,
      fullFilamentWeightGrams: 1000,
      tagUid: null,
      pricePaidCents: null,
      purchasedAt: null,
      location: null,
      lastDriedAt: null,
      createdAt: daysAgo(createdDaysAgo),
      updatedAt: daysAgo(createdDaysAgo),
      ...fields,
    } as Spool,
  };
}

const rows = [
  // Galaxy Black PLA ×3: #01 in use, #02 lent to Jonas, #03 full.
  row(materials.galaxyBlack, spoolTypes.prusamentCardboard, 240, {
    id: 'spool-gb-1',
    measuredTotalWeightGrams: 935,
    location: 'A2',
    pricePaidCents: 1999,
    purchasedAt: '2026-03-14',
  }),
  row(materials.galaxyBlack, spoolTypes.prusamentCardboard, 120, {
    id: 'spool-gb-2',
    measuredTotalWeightGrams: 611,
    location: 'A2',
    pricePaidCents: 1999,
    purchasedAt: '2026-03-14',
  }),
  row(materials.galaxyBlack, spoolTypes.prusamentCardboard, 14, {
    id: 'spool-gb-3',
    measuredTotalWeightGrams: 1193,
    location: 'A3',
    pricePaidCents: 1999,
    purchasedAt: '2026-10-27',
  }),
  // Prusa Orange PETG: #01 low, #02 opened a month ago.
  row(materials.prusaOrange, spoolTypes.prusamentCardboard, 180, {
    id: 'spool-po-1',
    measuredTotalWeightGrams: 279,
    location: 'B1',
    lastDriedAt: daysAgo(20),
  }),
  row(materials.prusaOrange, spoolTypes.prusamentCardboard, 30, {
    id: 'spool-po-2',
    measuredTotalWeightGrams: 848,
    location: 'B1',
  }),
  // Fire Engine Red PETG, never dried in 90 days: "Dry?".
  row(materials.fireEngineRed, spoolTypes.esunPlastic, 90, {
    id: 'spool-fer-1',
    measuredTotalWeightGrams: 784,
    location: 'C2',
    pricePaidCents: 2290,
  }),
  // Basic Cyan PLA: one spent spool.
  row(materials.basicCyan, spoolTypes.bambuReusable, 200, {
    id: 'spool-bc-1',
    measuredTotalWeightGrams: 253,
    location: 'AMS 2',
  }),
];

/** Grouped like the dashboard: one MaterialInventory per material. */
export const inventory: MaterialInventory[] = groupInventory(
  rows,
  new Map([['spool-gb-2', 'Jonas']])
);

// groupInventory computes the drying hint against the real clock; pin it to
// FIXTURE_NOW so the stories don't change as time passes.
for (const entry of inventory) {
  for (const s of entry.spools) {
    s.needsDrying =
      !s.isEmpty &&
      needsDrying(
        entry.material.filamentType,
        s.lastDriedAt,
        s.createdAt,
        FIXTURE_NOW
      );
  }
}

const byMaterial = (m: Material) =>
  inventory.find((i) => i.material.id === m.id)!;

export const galaxyBlackPla = byMaterial(materials.galaxyBlack);
export const prusaOrangePetg = byMaterial(materials.prusaOrange);
export const fireEngineRedPetg = byMaterial(materials.fireEngineRed);
export const basicCyanPla = byMaterial(materials.basicCyan);

export const spools = {
  /** Galaxy Black #01 · A2 · 742 g, no tags. */
  inUse: galaxyBlackPla.spools[0],
  /** Galaxy Black #02 · A2 · 418 g, lent to Jonas. */
  lent: galaxyBlackPla.spools[1],
  /** Galaxy Black #03 · A3 · 1000 g, full. */
  full: galaxyBlackPla.spools[2],
  /** Prusa Orange #01 · B1 · 86 g, low. */
  low: prusaOrangePetg.spools[0],
  /** Fire Engine Red #01 · C2 · 560 g, needs drying. */
  dry: fireEngineRedPetg.spools[0],
  /** Basic Cyan #01 · AMS 2 · 3 g, empty. */
  empty: basicCyanPla.spools[0],
} satisfies Record<string, SpoolView>;
