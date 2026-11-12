import { FILAMENT_TYPES } from '@/lib/filament';

// Possible-duplicate detection for the admin review queue. Pure: the caller
// feeds a bounded candidate set from SQL (same manufacturer or a trigram name
// match, see lib/catalog-review.ts), never the whole catalog. Spool types
// get a simpler, colour-free twin at the end of the file.

export type DuplicateReason = 'same-name' | 'close-color' | 'similar';

export type DuplicateSubject = {
  id: string;
  manufacturer: string;
  name: string;
  filamentType: string;
  color: string | null;
};

export type DuplicateMatch<T extends DuplicateSubject> = {
  candidate: T;
  reason: DuplicateReason;
  /** CIEDE2000 distance to the subject's colour; null when either has none. */
  deltaE: number | null;
};

/** At or below this the colours are indistinguishable on a spool. */
export const CLOSE_COLOR_DELTA_E = 3;
/** At or below this a same-line colour is worth a second look. */
export const SIMILAR_COLOR_DELTA_E = 10;

export type Lab = { L: number; a: number; b: number };

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** sRGB hex (#rgb / #rrggbb, hash optional) → CIELAB under D65; null if unparsable. */
export function hexToLab(hex: string | null | undefined): Lab | null {
  const m = hex?.trim().match(HEX);
  if (!m) return null;
  const digits =
    m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(digits.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  // Linear sRGB → XYZ, normalised by the D65 white point.
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t: number) =>
    t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116;
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

const deg = (rad: number) => (rad * 180) / Math.PI;
const rad = (d: number) => (d * Math.PI) / 180;

/** CIEDE2000 colour difference (kL = kC = kH = 1). */
export function deltaE2000(c1: Lab, c2: Lab): number {
  const C1 = Math.hypot(c1.a, c1.b);
  const C2 = Math.hypot(c2.a, c2.b);
  const Cbar7 = ((C1 + C2) / 2) ** 7;
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + 25 ** 7)));
  const a1 = (1 + G) * c1.a;
  const a2 = (1 + G) * c2.a;
  const C1p = Math.hypot(a1, c1.b);
  const C2p = Math.hypot(a2, c2.b);
  const hue = (b: number, a: number) =>
    b === 0 && a === 0 ? 0 : (deg(Math.atan2(b, a)) + 360) % 360;
  const h1 = hue(c1.b, a1);
  const h2 = hue(c2.b, a2);

  const dL = c2.L - c1.L;
  const dC = C2p - C1p;
  let dh = 0;
  if (C1p * C2p !== 0) {
    dh = h2 - h1;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dh / 2));

  const Lbar = (c1.L + c2.L) / 2;
  const Cbar = (C1p + C2p) / 2;
  let hbar = h1 + h2;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1 - h2) <= 180) hbar /= 2;
    else hbar = h1 + h2 < 360 ? (hbar + 360) / 2 : (hbar - 360) / 2;
  }

  const T =
    1 -
    0.17 * Math.cos(rad(hbar - 30)) +
    0.24 * Math.cos(rad(2 * hbar)) +
    0.32 * Math.cos(rad(3 * hbar + 6)) -
    0.2 * Math.cos(rad(4 * hbar - 63));
  const SL = 1 + (0.015 * (Lbar - 50) ** 2) / Math.sqrt(20 + (Lbar - 50) ** 2);
  const SC = 1 + 0.045 * Cbar;
  const SH = 1 + 0.015 * Cbar * T;
  const Cbarp7 = Cbar ** 7;
  const RT =
    -2 *
    Math.sqrt(Cbarp7 / (Cbarp7 + 25 ** 7)) *
    Math.sin(rad(60 * Math.exp(-(((hbar - 275) / 25) ** 2))));

  const l = dL / SL;
  const c = dC / SC;
  const h = dH / SH;
  return Math.sqrt(l * l + c * c + h * h + RT * c * h);
}

const TYPE_TOKENS = new Set(FILAMENT_TYPES.map((t) => t.toLowerCase()));
const SPELLING: Record<string, string> = { matte: 'matt', grey: 'gray' };

function nameTokens(name: string): string[] {
  const tokens = name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    // "1kg" and "1 kg", "1.75mm" and "1.75 mm" are the same words.
    .replace(/(\p{N})(\p{L})/gu, '$1 $2')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((t) => SPELLING[t] ?? t);
  const named = tokens.filter((t) => !TYPE_TOKENS.has(t));
  // A name that is only a type code ("PLA") keeps it rather than vanishing.
  return named.length > 0 ? named : tokens;
}

/** Comparison key for material names: case, accents, punctuation, type codes folded away. */
export function normalizeMaterialName(name: string): string {
  return nameTokens(name).join(' ');
}

const key = (s: string) => s.trim().toLowerCase();

// Jaccard similarity of the name tokens, and whether they overlap enough to
// flag: one name contains the other, or at least half the tokens are shared.
function nameOverlap(a: string[], b: string[]) {
  const setA = new Set(a);
  const setB = new Set(b);
  const shared = [...setA].filter((t) => setB.has(t)).length;
  const jaccard = shared === 0 ? 0 : shared / (setA.size + setB.size - shared);
  const subset = shared > 0 && (shared === setA.size || shared === setB.size);
  return { jaccard, overlaps: subset || jaccard >= 0.5 };
}

const RANK: Record<DuplicateReason, number> = {
  'same-name': 0,
  'close-color': 1,
  similar: 2,
};

/**
 * Catalog entries that may duplicate `subject`, most likely first:
 * - **same-name**: same manufacturer and normalised name (any filament type),
 * - **close-color**: same manufacturer and type, ΔE ≤ {@link CLOSE_COLOR_DELTA_E},
 * - **similar**: overlapping names (any manufacturer), or same manufacturer and
 *   type with ΔE ≤ {@link SIMILAR_COLOR_DELTA_E}.
 */
export function findDuplicateCandidates<T extends DuplicateSubject>(
  subject: DuplicateSubject,
  candidates: readonly T[],
  { limit = 5 }: { limit?: number } = {}
): DuplicateMatch<T>[] {
  const subjectTokens = nameTokens(subject.name);
  const subjectName = subjectTokens.join(' ');
  const subjectLab = hexToLab(subject.color);
  const matches: (DuplicateMatch<T> & { jaccard: number })[] = [];

  for (const candidate of candidates) {
    if (candidate.id === subject.id) continue;
    const sameMaker = key(candidate.manufacturer) === key(subject.manufacturer);
    const sameType = key(candidate.filamentType) === key(subject.filamentType);
    const tokens = nameTokens(candidate.name);
    const candidateLab = hexToLab(candidate.color);
    const deltaE =
      subjectLab && candidateLab ? deltaE2000(subjectLab, candidateLab) : null;
    const colorDelta = sameMaker && sameType ? deltaE : null;
    const { jaccard, overlaps } = nameOverlap(subjectTokens, tokens);

    let reason: DuplicateReason | null = null;
    if (sameMaker && tokens.join(' ') === subjectName) reason = 'same-name';
    else if (colorDelta !== null && colorDelta <= CLOSE_COLOR_DELTA_E)
      reason = 'close-color';
    else if (
      overlaps ||
      (colorDelta !== null && colorDelta <= SIMILAR_COLOR_DELTA_E)
    )
      reason = 'similar';

    if (reason) matches.push({ candidate, reason, deltaE, jaccard });
  }

  return matches
    .sort(
      (x, y) =>
        RANK[x.reason] - RANK[y.reason] ||
        (x.deltaE ?? Infinity) - (y.deltaE ?? Infinity) ||
        y.jaccard - x.jaccard ||
        x.candidate.name.localeCompare(y.candidate.name)
    )
    .slice(0, limit)
    .map(({ candidate, reason, deltaE }) => ({ candidate, reason, deltaE }));
}

export type SpoolTypeDuplicateSubject = {
  id: string;
  manufacturer: string;
  name: string;
  emptyWeightGrams: number;
};

export type SpoolTypeDuplicateMatch<T extends SpoolTypeDuplicateSubject> = {
  candidate: T;
  reason: Exclude<DuplicateReason, 'close-color'>;
  /** Absolute difference of the empty-spool weights, in grams. */
  weightDelta: number;
};

/** Empty weights this close are the same reel measured twice. */
export const CLOSE_WEIGHT_GRAMS = 5;

/**
 * Spool-type twin of {@link findDuplicateCandidates}, without colour. Only
 * the same manufacturer counts — generic names like "Cardboard 1 kg" recur
 * across brands without being duplicates:
 * - **same-name**: equal normalised name,
 * - **similar**: overlapping names, or empty weights within
 *   {@link CLOSE_WEIGHT_GRAMS}.
 */
export function findSpoolTypeDuplicateCandidates<
  T extends SpoolTypeDuplicateSubject,
>(
  subject: SpoolTypeDuplicateSubject,
  candidates: readonly T[],
  { limit = 5 }: { limit?: number } = {}
): SpoolTypeDuplicateMatch<T>[] {
  const subjectTokens = nameTokens(subject.name);
  const subjectName = subjectTokens.join(' ');
  const matches: (SpoolTypeDuplicateMatch<T> & { jaccard: number })[] = [];

  for (const candidate of candidates) {
    if (candidate.id === subject.id) continue;
    if (key(candidate.manufacturer) !== key(subject.manufacturer)) continue;
    const tokens = nameTokens(candidate.name);
    const weightDelta = Math.abs(
      candidate.emptyWeightGrams - subject.emptyWeightGrams
    );
    const { jaccard, overlaps } = nameOverlap(subjectTokens, tokens);

    let reason: SpoolTypeDuplicateMatch<T>['reason'] | null = null;
    if (tokens.join(' ') === subjectName) reason = 'same-name';
    else if (overlaps || weightDelta <= CLOSE_WEIGHT_GRAMS) reason = 'similar';

    if (reason) matches.push({ candidate, reason, weightDelta, jaccard });
  }

  return matches
    .sort(
      (x, y) =>
        RANK[x.reason] - RANK[y.reason] ||
        x.weightDelta - y.weightDelta ||
        y.jaccard - x.jaccard ||
        x.candidate.name.localeCompare(y.candidate.name)
    )
    .slice(0, limit)
    .map(({ candidate, reason, weightDelta }) => ({
      candidate,
      reason,
      weightDelta,
    }));
}
