// What kind of value a datasheet property holds, declared on the definition
// (/admin/properties) and enforced on every write.
//
// Without this, values were free text and `parseBounds` read every run of digits
// as a separate number — so a decimal comma silently became a range: "1,24"
// parsed as 1–24 and matched a "density 20–30" filter. Typing a decimal comma is
// the norm in most of Europe, so declaring the type lets us normalise it ("1,24"
// -> "1.24") instead of storing something that quietly filters wrong.
//
// Client-usable (no server-only import): the admin form and the value editor
// both validate with it before submitting.

export const PROPERTY_VALUE_TYPES = [
  'number',
  'integer',
  'range',
  'list',
  'text',
] as const;

export type PropertyValueType = (typeof PROPERTY_VALUE_TYPES)[number];

export const PROPERTY_VALUE_TYPE_LABELS: Record<PropertyValueType, string> = {
  number: 'Number (1.24)',
  integer: 'Whole number (220)',
  range: 'Range (210–230)',
  list: 'List of numbers (1.75, 2.85)',
  text: 'Text (anything)',
};

export const PROPERTY_VALUE_TYPE_HINTS: Record<PropertyValueType, string> = {
  number: 'A decimal number, e.g. 1.24',
  integer: 'A whole number, e.g. 220',
  range: 'A range like 210–230, or a single number',
  list: 'Numbers separated by commas, e.g. 1.75, 2.85',
  text: 'Any text',
};

// Placeholder text for value inputs.
export const PROPERTY_VALUE_TYPE_EXAMPLES: Record<PropertyValueType, string> = {
  number: 'e.g. 1.24',
  integer: 'e.g. 220',
  range: 'e.g. 210–230',
  list: 'e.g. 1.75, 2.85',
  text: 'e.g. glossy',
};

export function isPropertyValueType(v: string): v is PropertyValueType {
  return (PROPERTY_VALUE_TYPES as readonly string[]).includes(v);
}

export type NormalizedValue = {
  // The canonical string to store and display.
  value: string;
  // Numeric span for the catalog's range filter; null for `text` and for
  // anything without a parseable number.
  min: number | null;
  max: number | null;
};

export type NormalizeResult =
  ({ ok: true } & NormalizedValue) | { ok: false; message: string };

// A decimal comma is a comma between two digits ("1,24"). In a list ("1,75, 2,85")
// the separators are commas too, so decimal commas are only recognised where a
// comma sits directly between digits AND the value has no other separator role
// to play — resolved per type below.
const DECIMAL_COMMA = /(\d),(\d)/g;

function toDot(input: string): string {
  // Repeat: overlapping matches ("1,2,3") need more than one pass.
  let out = input;
  let previous: string;
  do {
    previous = out;
    out = out.replace(DECIMAL_COMMA, '$1.$2');
  } while (out !== previous);
  return out;
}

function parseNumber(raw: string): number | null {
  const cleaned = toDot(raw.trim());
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

// Range separators people actually type: en dash (what the importer writes),
// em dash, hyphen, or "to".
const RANGE_SPLIT = /\s*(?:–|—|-|\bto\b)\s*/i;

export function normalizePropertyValue(
  type: PropertyValueType,
  raw: string
): NormalizeResult {
  const trimmed = raw.trim();
  if (trimmed === '') return { ok: false, message: 'Value is required' };

  switch (type) {
    case 'text':
      return { ok: true, value: trimmed, min: null, max: null };

    case 'number':
    case 'integer': {
      const n = parseNumber(trimmed);
      if (n === null)
        return {
          ok: false,
          message: `"${trimmed}" is not a ${type === 'integer' ? 'whole number' : 'number'} — enter a single value like ${type === 'integer' ? '220' : '1.24'} (a decimal comma is fine).`,
        };
      if (type === 'integer' && !Number.isInteger(n))
        return {
          ok: false,
          message: `"${trimmed}" is not a whole number — enter a value like 220.`,
        };
      const value = String(n);
      return { ok: true, value, min: n, max: n };
    }

    case 'range': {
      const parts = toDot(trimmed).split(RANGE_SPLIT).filter(Boolean);
      if (parts.length > 2)
        return {
          ok: false,
          message: `"${trimmed}" is not a range — enter one value or two, like 210–230.`,
        };
      const numbers = parts.map(parseNumber);
      if (numbers.some((n) => n === null))
        return {
          ok: false,
          message: `"${trimmed}" is not a range — enter numbers like 210–230 (a decimal comma is fine).`,
        };
      const [lo, hi] = [
        Math.min(...(numbers as number[])),
        Math.max(...(numbers as number[])),
      ];
      // Store the en dash the UI already displays; a single value stays single.
      return {
        ok: true,
        value: lo === hi ? String(lo) : `${lo}–${hi}`,
        min: lo,
        max: hi,
      };
    }

    case 'list': {
      // Commas are separators here, so a decimal comma is genuinely ambiguous:
      // "1,75" could be one value or two. Dots disambiguate ("1.75,2.85" is two
      // values), and so does a space after each separator ("1, 2, 3" is three).
      // A tight comma between digits with no dot anywhere is rejected rather
      // than guessed at — guessing is how "1,75, 2,85" became 1, 75, 2, 85.
      if (!trimmed.includes('.') && /\d,\d/.test(trimmed))
        return {
          ok: false,
          message: `"${trimmed}" is ambiguous — use a dot for decimals (1.75, 2.85), or put a space after each comma for a list of whole numbers.`,
        };
      const parts = trimmed
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length === 0)
        return { ok: false, message: 'Value is required' };
      const numbers = parts.map((p) =>
        /^\d+(\.\d+)?$/.test(p) ? Number(p) : null
      );
      if (numbers.some((n) => n === null))
        return {
          ok: false,
          message: `"${trimmed}" is not a list of numbers — separate values with commas and use a dot for decimals, like 1.75, 2.85.`,
        };
      const nums = numbers as number[];
      return {
        ok: true,
        value: nums.join(', '),
        min: Math.min(...nums),
        max: Math.max(...nums),
      };
    }
  }
}
