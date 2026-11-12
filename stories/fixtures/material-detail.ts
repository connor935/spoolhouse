// Shared story/test fixtures for the material detail page (MaterialDetail and
// MaterialDetailMobile boards): datasheet values, the 12-month usage and the
// "In your groups" table. Built on the inventory/social/usage fixtures and
// typed against the real read results.
import type { Property } from '@/lib/db/schema';
import { materialStockSummary } from '@/lib/filament';
import type { MaterialGroupSpool } from '@/lib/material-detail';
import type { MaterialPropertyView } from '@/lib/material-properties';
import type { MaterialUsageHistory } from '@/lib/usage-stats';

import { daysAgo, galaxyBlackPla } from './inventory';
import { groupNames, people, stock } from './social';
import { materialMonthlyUsage } from './usage';

export { FIXTURE_NOW } from './inventory';

function definition(
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

export const propertyDefinitions: Property[] = [
  definition('prop-density', {
    key: 'density',
    name: 'Density',
    unit: 'g/cm³',
    valueType: 'number',
  }),
  definition('prop-diameter', {
    key: 'diameter',
    name: 'Diameter',
    unit: 'mm',
    valueType: 'list',
  }),
  definition('prop-extruder', {
    key: 'extruder_temp',
    name: 'Extruder temp',
    unit: '°C',
    valueType: 'range',
  }),
  definition('prop-bed', {
    key: 'bed_temp',
    name: 'Bed temp',
    unit: '°C',
    valueType: 'range',
  }),
  definition('prop-drying', {
    key: 'drying_temp',
    name: 'Drying temp',
    unit: '°C',
    valueType: 'integer',
  }),
  definition('prop-tensile', {
    key: 'tensile_strength',
    name: 'Tensile strength',
    unit: 'MPa',
    valueType: 'number',
  }),
  definition('prop-tg', {
    key: 'glass_transition_temp',
    name: 'Glass-transition temp',
    unit: '°C',
    valueType: 'integer',
  }),
];

function value(
  propertyId: string,
  value: string,
  submittedByName: string | null = null
): MaterialPropertyView {
  const d = propertyDefinitions.find((p) => p.id === propertyId)!;
  return {
    id: `val-${propertyId}`,
    propertyId,
    key: d.key,
    name: d.name,
    unit: d.unit,
    value,
    verified: submittedByName === null,
    submittedByName,
  };
}

/** MaterialDetail board, 03 Properties: four verified, two member edits. */
export const propertyValues: MaterialPropertyView[] = [
  value('prop-bed', '60'),
  value('prop-density', '1.24'),
  value('prop-diameter', '1.75, 2.85'),
  value('prop-drying', '55', people.anna.name),
  value('prop-extruder', '210–230'),
  value('prop-tensile', '46', people.anna.name),
];

/** "340 g used in the last 30 days · lasts about 6 months at this pace". */
export const materialUsage: MaterialUsageHistory = {
  usedLast30Grams: 340,
  gramsPerDay: 2160 / 180,
  monthly: materialMonthlyUsage,
};

export const noUsage: MaterialUsageHistory = {
  usedLast30Grams: 0,
  gramsPerDay: 0,
  monthly: materialMonthlyUsage.map((m) => ({ ...m, grams: 0, costCents: 0 })),
};

export const galaxyBlackSummary = materialStockSummary(galaxyBlackPla.spools);

/** 04 In your groups: Anna's free spool, Jonas's you asked for, Lena's in Kiel. */
export const materialGroupStock: MaterialGroupSpool[] = [
  {
    groupId: 'group-farm',
    groupName: groupNames.farm,
    number: 2,
    spool: stock.available,
  },
  {
    groupId: 'group-farm',
    groupName: groupNames.farm,
    number: 5,
    spool: stock.requestedByYou,
  },
  {
    groupId: 'group-kiel',
    groupName: groupNames.kiel,
    number: 11,
    spool: {
      ...stock.available,
      id: 'spool-lena-11',
      ownerId: people.lena.id,
      ownerName: people.lena.name,
      filamentLeftGrams: 230,
      percentLeft: 23,
    },
  },
];
