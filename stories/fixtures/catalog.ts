// Shared story/test fixtures for the catalog & admin surfaces, matching the
// CatalogMaterials / CatalogSpoolTypes / AdminMaterials / ReviewQueue /
// AdminImport design boards. Typed against the real schema so they break
// when the domain types change.
import type { Material, Property, SpoolType } from '@/lib/db/schema';
import type { FilterValue } from '@/lib/filter-value';
import { daysAgo } from './inventory';

const VIEWER_ID = 'user-viewer';
const OTHER_ID = 'user-other';

type Status = 'approved' | 'pending' | 'rejected';

function material(
  id: string,
  fields: Pick<Material, 'manufacturer' | 'name' | 'filamentType' | 'color'>,
  status: Status = 'approved',
  submittedById: string | null = null
): Material {
  return {
    id,
    status,
    submittedById,
    reviewedById: null,
    externalKey: null,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(30),
    ...fields,
  } as Material;
}

function spoolType(
  id: string,
  fields: Pick<SpoolType, 'manufacturer' | 'name' | 'emptyWeightGrams'>,
  status: Status = 'approved',
  submittedById: string | null = null
): SpoolType {
  return {
    id,
    status,
    submittedById,
    reviewedById: null,
    externalKey: null,
    createdAt: daysAgo(400),
    updatedAt: daysAgo(400),
    ...fields,
  } as SpoolType;
}

/** One catalog row as a page would hand it to CatalogRow. */
export type CatalogMaterialEntry = {
  material: Material;
  /** Spools of it the viewer owns. */
  stockCount: number;
  own: boolean;
};

export type ManufacturerGroup<T> = {
  manufacturer: string;
  /** Total in the catalog for this manufacturer, not just the rows shown. */
  total: number;
  entries: T[];
};

function entry(m: Material, stockCount = 0): CatalogMaterialEntry {
  return { material: m, stockCount, own: m.submittedById === VIEWER_ID };
}

/** CatalogMaterials board: search "pla", three manufacturer groups. */
export const materialGroups: ManufacturerGroup<CatalogMaterialEntry>[] = [
  {
    manufacturer: 'Bambu Lab',
    total: 214,
    entries: [
      entry(
        material('cat-basic-cyan', {
          manufacturer: 'Bambu Lab',
          name: 'Basic Cyan',
          filamentType: 'PLA',
          color: '#0086D6',
        }),
        1
      ),
      entry(
        material('cat-jade-white', {
          manufacturer: 'Bambu Lab',
          name: 'Basic Jade White',
          filamentType: 'PLA',
          color: '#F2F2EE',
        })
      ),
      entry(
        material('cat-desert-tan', {
          manufacturer: 'Bambu Lab',
          name: 'Matte Desert Tan',
          filamentType: 'PLA',
          color: '#E4BD68',
        })
      ),
    ],
  },
  {
    manufacturer: 'Prusament',
    total: 96,
    entries: [
      entry(
        material('cat-galaxy-black', {
          manufacturer: 'Prusament',
          name: 'Galaxy Black',
          filamentType: 'PLA',
          color: '#1F1F1F',
        }),
        3
      ),
      entry(
        material('cat-galaxy-purple', {
          manufacturer: 'Prusament',
          name: 'Galaxy Purple',
          filamentType: 'PLA',
          color: '#4B2D5E',
        })
      ),
      entry(
        material('cat-prusa-orange', {
          manufacturer: 'Prusament',
          name: 'Prusa Orange',
          filamentType: 'PLA',
          color: '#F26B21',
        })
      ),
    ],
  },
  {
    manufacturer: 'Sunlu',
    total: 142,
    entries: [
      entry(
        material(
          'cat-galaxy-blue',
          {
            manufacturer: 'Sunlu',
            name: 'Galaxy Blue',
            filamentType: 'PLA',
            color: '#23407A',
          },
          'pending',
          VIEWER_ID
        )
      ),
      entry(
        material(
          'cat-silk-rainbow',
          {
            manufacturer: 'Sunlu',
            name: 'Silk Rainbow',
            filamentType: 'PLA',
            color: '#E85D75',
          },
          'rejected',
          VIEWER_ID
        )
      ),
      entry(
        material('cat-silk-gold', {
          manufacturer: 'Sunlu',
          name: 'Silk Gold',
          filamentType: 'PLA',
          color: '#C9A23F',
        }),
        2
      ),
    ],
  },
];

export const catalogCounts = { matching: 1204, total: 23871, pageSize: 150 };

export type CatalogSpoolTypeEntry = {
  spoolType: SpoolType;
  /** Spools of any user on this type. */
  inUseCount: number;
  own: boolean;
};

function typeEntry(s: SpoolType, inUseCount = 0): CatalogSpoolTypeEntry {
  return { spoolType: s, inUseCount, own: s.submittedById === VIEWER_ID };
}

/** CatalogSpoolTypes board: search "cardboard". */
export const spoolTypeGroups: ManufacturerGroup<CatalogSpoolTypeEntry>[] = [
  {
    manufacturer: 'Extrudr',
    total: 3,
    entries: [
      typeEntry(
        spoolType('st-extrudr-11', {
          manufacturer: 'Extrudr',
          name: 'Cardboard 1.1 kg',
          emptyWeightGrams: 216,
        })
      ),
      typeEntry(
        spoolType('st-extrudr-25', {
          manufacturer: 'Extrudr',
          name: 'Cardboard 2.5 kg',
          emptyWeightGrams: 410,
        })
      ),
    ],
  },
  {
    manufacturer: 'Polymaker',
    total: 4,
    entries: [
      typeEntry(
        spoolType('st-polymaker-1', {
          manufacturer: 'Polymaker',
          name: 'Cardboard 1 kg (2022+)',
          emptyWeightGrams: 140,
        })
      ),
      typeEntry(
        spoolType(
          'st-polymaker-3',
          {
            manufacturer: 'Polymaker',
            name: 'Cardboard 3 kg',
            emptyWeightGrams: 520,
          },
          'pending',
          VIEWER_ID
        )
      ),
    ],
  },
  {
    manufacturer: 'Prusament',
    total: 2,
    entries: [
      typeEntry(
        spoolType('st-prusament-1', {
          manufacturer: 'Prusament',
          name: 'Cardboard 1 kg',
          emptyWeightGrams: 193,
        }),
        9
      ),
      typeEntry(
        spoolType(
          'st-prusament-2',
          {
            manufacturer: 'Prusament',
            name: 'Cardboard 2 kg',
            emptyWeightGrams: 330,
          },
          'rejected',
          OTHER_ID
        )
      ),
    ],
  },
];

/** AdminMaterials board: pending first, with submitter and age. */
export type AdminMaterialEntry = {
  material: Material;
  submittedBy: string | null;
  submittedAgo: string;
  spoolCount: number;
};

export const adminMaterialRows: AdminMaterialEntry[] = [
  {
    material: material(
      'adm-galaxy-blue',
      {
        manufacturer: 'Sunlu',
        name: 'Galaxy Blue',
        filamentType: 'PLA',
        color: '#23407A',
      },
      'pending',
      OTHER_ID
    ),
    submittedBy: 'Anna Weber',
    submittedAgo: '2 h ago',
    spoolCount: 1,
  },
  {
    material: material(
      'adm-mint',
      {
        manufacturer: 'Extrudr',
        name: 'Mint',
        filamentType: 'PLA',
        color: '#9ADBC0',
      },
      'pending',
      OTHER_ID
    ),
    submittedBy: 'Tom Richter',
    submittedAgo: '1 d ago',
    spoolCount: 2,
  },
  {
    material: material(
      'adm-bottle-green',
      {
        manufacturer: 'Fiberlogy',
        name: 'Easy PETG Bottle Green',
        filamentType: 'PETG',
        color: '#2E7D4F',
      },
      'pending',
      OTHER_ID
    ),
    submittedBy: 'Mia Koch',
    submittedAgo: '3 d ago',
    spoolCount: 0,
  },
  {
    material: material(
      'adm-silk-rainbow',
      {
        manufacturer: 'Sunlu',
        name: 'Silk Rainbow',
        filamentType: 'PLA',
        color: '#E85D75',
      },
      'rejected',
      OTHER_ID
    ),
    submittedBy: 'Mia Koch',
    submittedAgo: '5 d ago',
    spoolCount: 0,
  },
  {
    material: material('adm-galaxy-black', {
      manufacturer: 'Prusament',
      name: 'Galaxy Black',
      filamentType: 'PLA',
      color: '#1F1F1F',
    }),
    submittedBy: null,
    submittedAgo: '2 mo ago',
    spoolCount: 12,
  },
];

/** ReviewQueue board: the pending entry and its possible duplicates. */
export const reviewEntry = adminMaterialRows[0];

export const duplicateCandidates = [
  {
    material: material('dup-galaxy-blue-petg', {
      manufacturer: 'Sunlu',
      name: 'Galaxy Blue',
      filamentType: 'PETG',
      color: '#23407A',
    }),
    reason: 'same-name' as const,
    deltaE: null,
    spoolCount: 4,
  },
  {
    material: material('dup-galaxy-dark-blue', {
      manufacturer: 'Sunlu',
      name: 'Galaxy Dark Blue',
      filamentType: 'PLA',
      color: '#26407C',
    }),
    reason: 'close-color' as const,
    deltaE: 1.8,
  },
  {
    material: material('dup-sparkle-blue', {
      manufacturer: 'Sunlu',
      name: 'Sparkle Blue',
      filamentType: 'PLA',
      color: '#2B3F8C',
    }),
    reason: 'similar' as const,
    deltaE: 6.4,
  },
];

function property(
  id: string,
  fields: Pick<Property, 'key' | 'name' | 'unit' | 'valueType'>
): Property {
  return {
    id,
    description: null,
    createdAt: daysAgo(200),
    updatedAt: daysAgo(200),
    ...fields,
  };
}

/** Seeded datasheet definitions plus a text one (never range-filtered). */
export const filterProperties: Property[] = [
  property('prop-density', {
    key: 'density',
    name: 'Density',
    unit: 'g/cm³',
    valueType: 'number',
  }),
  property('prop-extruder', {
    key: 'extruder_temp',
    name: 'Extruder temp',
    unit: '°C',
    valueType: 'range',
  }),
  property('prop-bed', {
    key: 'bed_temp',
    name: 'Bed temp',
    unit: '°C',
    valueType: 'range',
  }),
  property('prop-finish', {
    key: 'finish',
    name: 'Finish',
    unit: null,
    valueType: 'text',
  }),
];

/** Patterns board, section 01: "Filters · 3" (types, min remaining, density). */
export const patternsFilterValue: FilterValue = {
  filamentTypes: ['PLA', 'PETG'],
  minLeftGrams: 300,
  hideLent: false,
  propertyConstraints: [
    { id: 'prop-density', propertyId: 'prop-density', min: 1.2, max: 1.3 },
  ],
};

/** AdminImport board rows (the shape of UpstreamManufacturer). */
export const upstreamManufacturers = [
  {
    slug: 'bambulab',
    manufacturerName: 'Bambu Lab',
    importedCount: 214,
    lastImportedAt: daysAgo(3),
    lastError: null,
  },
  {
    slug: 'esun',
    manufacturerName: 'eSun',
    importedCount: 188,
    lastImportedAt: daysAgo(3),
    lastError: null,
  },
  {
    slug: 'extrudr',
    manufacturerName: null,
    importedCount: 0,
    lastImportedAt: null,
    lastError: null,
  },
  {
    slug: 'fiberlogy',
    manufacturerName: 'Fiberlogy',
    importedCount: 0,
    lastImportedAt: daysAgo(1),
    lastError: 'SpoolmanDB returned 502 Bad Gateway.',
  },
  {
    slug: 'polymaker',
    manufacturerName: 'Polymaker',
    importedCount: 312,
    lastImportedAt: daysAgo(10),
    lastError: null,
  },
  {
    slug: 'prusament',
    manufacturerName: 'Prusament',
    importedCount: 96,
    lastImportedAt: daysAgo(10),
    lastError: null,
  },
  {
    slug: 'sunlu',
    manufacturerName: null,
    importedCount: 0,
    lastImportedAt: null,
    lastError: null,
  },
];
