// Case table for lib/property-value.ts — the normalisation rules are subtle
// (decimal commas, range separators, ambiguous lists) and quietly getting them
// wrong corrupts the catalog's range filter. Run with:
//
//   npx tsx scripts/check-property-values.ts
//
// Exits non-zero on the first mismatch. No DB or server needed.
import {
  normalizePropertyValue,
  type PropertyValueType,
} from '../lib/property-value';

const cases: [PropertyValueType, string, string | null][] = [
  // [type, input, expected canonical value or null if it must be rejected]
  ['number', '1.24', '1.24'],
  ['number', '1,24', '1.24'], // the bug that started this
  ['number', ' 1,24 ', '1.24'],
  ['number', '19,99 €', null], // unit belongs on the definition
  ['number', '210-230', null],
  ['number', 'abc', null],
  ['integer', '220', '220'],
  ['integer', '220.5', null],
  ['integer', '220,5', null],
  ['range', '210–230', '210–230'], // en dash
  ['range', '210-230', '210–230'], // hyphen normalised
  ['range', '210 to 230', '210–230'],
  ['range', '230–210', '210–230'], // ends sorted
  ['range', '215', '215'], // single value stays single
  ['range', '60,5–61,5', '60.5–61.5'], // decimal commas inside a range
  ['range', '1–2–3', null],
  ['list', '1.75, 2.85', '1.75, 2.85'],
  ['list', '1.75,2.85', '1.75, 2.85'],
  ['list', '1.75', '1.75'],
  ['list', '1,75, 2,85', null], // ambiguous: comma is the separator here
  ['list', '1, 2, 3', '1, 2, 3'], // spaces make the separators unambiguous
  ['list', '1,2,3', null], // tight commas, no dots -> ambiguous
  ['text', 'glossy, slightly flexible', 'glossy, slightly flexible'],
  ['text', '  spaced  ', 'spaced'],
  ['text', '', null],
];

let failures = 0;
for (const [type, input, expected] of cases) {
  const result = normalizePropertyValue(type, input);
  const got = result.ok ? result.value : null;
  const pass = got === expected;
  if (!pass) failures++;
  console.log(
    `${pass ? 'ok  ' : 'FAIL'} ${type.padEnd(8)} ${JSON.stringify(input).padEnd(24)} -> ${JSON.stringify(got)}${pass ? '' : `  (expected ${JSON.stringify(expected)})`}`
  );
}

// bounds must mirror what the SQL range filter compares against
const bounds: [PropertyValueType, string, number | null, number | null][] = [
  ['number', '1,24', 1.24, 1.24],
  ['range', '210–230', 210, 230],
  ['list', '1.75, 2.85', 1.75, 2.85],
  ['text', 'anything', null, null],
];
for (const [type, input, min, max] of bounds) {
  const r = normalizePropertyValue(type, input);
  const ok = r.ok && r.min === min && r.max === max;
  if (!ok) failures++;
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} bounds  ${type.padEnd(8)} ${JSON.stringify(input).padEnd(15)} -> [${r.ok ? r.min : '?'}, ${r.ok ? r.max : '?'}]`
  );
}

console.log(failures === 0 ? '\nall cases pass' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
