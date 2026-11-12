// Value of the shared filter field set (FilterPanel / FilterSheet in
// components/common/) and the chips derived from it. Pure and client-usable,
// so Inventory, Group stock and the catalog can each map it onto their own URL
// params and queries.
import type { Property } from '@/lib/db/schema';
import { formatWeight } from '@/lib/filament';
import {
  constraintActive,
  type PropertyConstraint,
} from '@/lib/property-filter';

export type FilterValue = {
  /** Selected filament types; empty = all types. */
  filamentTypes: string[];
  /** Minimum filament left per spool, in grams; null = no minimum. */
  minLeftGrams: number | null;
  /** Hide spools that are lent out (group stock). */
  hideLent: boolean;
  /** Datasheet-property ranges, at most one per property. */
  propertyConstraints: PropertyConstraint[];
};

export const EMPTY_FILTER_VALUE: FilterValue = {
  filamentTypes: [],
  minLeftGrams: null,
  hideLent: false,
  propertyConstraints: [],
};

/**
 * Number of active fields, as on the "Filters · 3" button: the type selection
 * counts once however many types are picked, each property range once.
 */
export function countActiveFilters(value: FilterValue): number {
  return (
    (value.filamentTypes.length > 0 ? 1 : 0) +
    (value.minLeftGrams !== null ? 1 : 0) +
    (value.hideLent ? 1 : 0) +
    value.propertyConstraints.filter(constraintActive).length
  );
}

/**
 * Parses a typed bound: blank or unreadable input is "no bound". One decimal
 * comma is read as a point ("1,24" → 1.24); this is a single number, never a
 * list, so there is no ambiguity.
 */
export function parseFilterNumber(raw: string): number | null {
  const s = raw.trim().replace(/^(-?\d*),(\d*)$/, '$1.$2');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Sets one bound of a property's range. Clearing both bounds drops the
 * constraint; an edited constraint keeps its position, so chips don't reorder.
 */
export function setPropertyBound(
  constraints: PropertyConstraint[],
  propertyId: string,
  which: 'min' | 'max',
  bound: number | null
): PropertyConstraint[] {
  const existing = constraints.find((c) => c.propertyId === propertyId);
  const min = which === 'min' ? bound : (existing?.min ?? null);
  const max = which === 'max' ? bound : (existing?.max ?? null);
  if (min === null && max === null) {
    return constraints.filter((c) => c.propertyId !== propertyId);
  }
  const next = { id: existing?.id ?? propertyId, propertyId, min, max };
  return existing
    ? constraints.map((c) => (c === existing ? next : c))
    : [...constraints, next];
}

export type FilterChip = { id: string; label: string };

type ChipProperty = Pick<Property, 'id' | 'name' | 'unit'>;

function rangeLabel(min: number | null, max: number | null): string {
  if (min !== null && max !== null) return `${min}–${max}`;
  return min !== null ? `≥ ${min}` : `≤ ${max}`;
}

/**
 * One removable chip per active filter: each picked type, the minimum, hide
 * lent, and each property range ("Density 1.2–1.3 g/cm³"). A range whose
 * definition has since been deleted still gets a chip, so it can be removed.
 */
export function filterChips(
  value: FilterValue,
  properties: readonly ChipProperty[]
): FilterChip[] {
  const chips: FilterChip[] = value.filamentTypes.map((t) => ({
    id: `type:${t}`,
    label: t,
  }));
  if (value.minLeftGrams !== null) {
    chips.push({
      id: 'minLeft',
      label: `≥ ${formatWeight(value.minLeftGrams)} left`,
    });
  }
  if (value.hideLent) chips.push({ id: 'hideLent', label: 'Lent hidden' });
  for (const c of value.propertyConstraints) {
    if (!constraintActive(c)) continue;
    const property = properties.find((p) => p.id === c.propertyId);
    const range = rangeLabel(c.min, c.max);
    chips.push({
      id: `prop:${c.propertyId}`,
      label: property
        ? [property.name, range, property.unit].filter(Boolean).join(' ')
        : `Removed property ${range}`,
    });
  }
  return chips;
}

/** The value without the filter a chip stands for; unknown ids change nothing. */
export function removeFilterChip(value: FilterValue, id: string): FilterValue {
  if (id.startsWith('type:')) {
    const type = id.slice('type:'.length);
    return {
      ...value,
      filamentTypes: value.filamentTypes.filter((t) => t !== type),
    };
  }
  if (id === 'minLeft') return { ...value, minLeftGrams: null };
  if (id === 'hideLent') return { ...value, hideLent: false };
  if (id.startsWith('prop:')) {
    const propertyId = id.slice('prop:'.length);
    return {
      ...value,
      propertyConstraints: value.propertyConstraints.filter(
        (c) => c.propertyId !== propertyId
      ),
    };
  }
  return value;
}
