// Client-usable helpers for numeric range-filtering of material property
// values. Values are free text in three shapes — scalar ("1.27"), range
// ("220–250", en-dash) and list ("1.75, 2.85") — so we parse the numeric
// bounds of each and match by overlap. NOT server-only (the catalog filter
// runs client-side).

// Lowest and highest numbers found in a value string, or null if none. The
// en-dash separator (U+2013) is not a minus sign, so range bounds parse as
// two positive numbers rather than one negative.
export function parseBounds(value: string): [number, number] | null {
  const nums = value.match(/\d+(\.\d+)?/g)?.map(Number);
  if (!nums || nums.length === 0) return null;
  return [Math.min(...nums), Math.max(...nums)];
}

export function overlaps(
  [lo, hi]: [number, number],
  min: number | null,
  max: number | null
): boolean {
  return (min == null || hi >= min) && (max == null || lo <= max);
}

// Whether a property value's numeric span overlaps the [min, max] query
// (either bound optional). A value with no parseable number never matches.
export function valueMatchesRange(
  value: string,
  min: number | null,
  max: number | null
): boolean {
  const bounds = parseBounds(value);
  return bounds !== null && overlaps(bounds, min, max);
}

// One property-range constraint in the catalog filter. `id` is a stable local
// key for React lists; a constraint with no property or no bound is inactive.
export type PropertyConstraint = {
  id: string;
  propertyId: string;
  min: number | null;
  max: number | null;
};

export function constraintActive(c: PropertyConstraint): boolean {
  return c.propertyId !== '' && (c.min !== null || c.max !== null);
}

export function anyConstraintActive(constraints: PropertyConstraint[]): boolean {
  return constraints.some(constraintActive);
}

// A material matches iff every ACTIVE constraint has a value for its property
// whose numeric span overlaps the constraint's [min, max] (AND semantics). A
// material lacking a value for a constrained property is excluded.
export function materialMatchesConstraints(
  values: { propertyId: string; value: string }[],
  constraints: PropertyConstraint[]
): boolean {
  for (const c of constraints) {
    if (!constraintActive(c)) continue;
    const v = values.find((x) => x.propertyId === c.propertyId);
    if (!v || !valueMatchesRange(v.value, c.min, c.max)) return false;
  }
  return true;
}

// URL serialization for the dashboard's shareable-link filters. Only active
// constraints are emitted, as `propertyId:min:max` (bounds blank when null;
// property ids are UUIDs, so ':' and ',' are safe separators).
export function serializeConstraints(constraints: PropertyConstraint[]): string {
  return constraints
    .filter(constraintActive)
    .map((c) => `${c.propertyId}:${c.min ?? ''}:${c.max ?? ''}`)
    .join(',');
}

export function parseConstraints(param: string): PropertyConstraint[] {
  if (!param) return [];
  const num = (s: string): number | null => {
    if (s === '') return null;
    const n = Number(s);
    return Number.isNaN(n) ? null : n;
  };
  return param
    .split(',')
    .map((seg, i): PropertyConstraint => {
      const [propertyId = '', min = '', max = ''] = seg.split(':');
      return { id: `c-url-${i}`, propertyId, min: num(min), max: num(max) };
    })
    .filter(constraintActive);
}
