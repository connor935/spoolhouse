import { describe, expect, it } from 'vitest';
import {
  deltaE2000,
  findDuplicateCandidates,
  findSpoolTypeDuplicateCandidates,
  hexToLab,
  normalizeMaterialName,
  type DuplicateSubject,
} from '@/lib/catalog-duplicates';

describe('hexToLab', () => {
  it('maps the sRGB extremes and primaries to CIELAB (D65)', () => {
    const white = hexToLab('#FFFFFF')!;
    expect(white.L).toBeCloseTo(100, 1);
    expect(white.a).toBeCloseTo(0, 1);
    expect(white.b).toBeCloseTo(0, 1);
    expect(hexToLab('#000000')!.L).toBeCloseTo(0, 5);
    const red = hexToLab('#ff0000')!;
    expect(red.L).toBeCloseTo(53.24, 1);
    expect(red.a).toBeCloseTo(80.09, 1);
    expect(red.b).toBeCloseTo(67.2, 1);
  });

  it('accepts 3-digit and hash-less hex, rejects garbage', () => {
    expect(hexToLab('fff')!.L).toBeCloseTo(100, 1);
    expect(hexToLab('#12345')).toBeNull();
    expect(hexToLab('red')).toBeNull();
    expect(hexToLab(null)).toBeNull();
  });
});

describe('deltaE2000', () => {
  // Reference pairs from Sharma, Wu & Dalal (2005), "The CIEDE2000
  // color-difference formula: implementation notes".
  it.each([
    [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
    [[50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615],
    [[50, -1.3802, -84.2814], [50, 0, -82.7485], 1.0],
    [[50, 2.5, 0], [73, 25, -18], 27.1492],
    [[50, 2.5, 0], [50, 0, -2.5], 4.3065],
    [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
    [[22.7233, 20.0904, -46.694], [23.0331, 14.973, -42.5619], 2.0373],
  ])('%j vs %j = %f', ([L1, a1, b1], [L2, a2, b2], expected) => {
    const d = deltaE2000({ L: L1, a: a1, b: b1 }, { L: L2, a: a2, b: b2 });
    expect(d).toBeCloseTo(expected, 4);
  });

  it('is zero for identical colours and symmetric', () => {
    const c = { L: 40, a: 10, b: -20 };
    const e = { L: 45, a: 12, b: -15 };
    expect(deltaE2000(c, c)).toBe(0);
    expect(deltaE2000(c, e)).toBeCloseTo(deltaE2000(e, c), 10);
  });
});

describe('normalizeMaterialName', () => {
  it('folds case, accents, punctuation and spelling variants', () => {
    expect(normalizeMaterialName('  Galaxy-Blue ')).toBe('galaxy blue');
    expect(normalizeMaterialName('Matte Grey')).toBe('matt gray');
    expect(normalizeMaterialName('Café Crème')).toBe('cafe creme');
  });

  it('drops filament-type tokens so "Galaxy Blue PLA" equals "Galaxy Blue"', () => {
    expect(normalizeMaterialName('Galaxy Blue PLA')).toBe('galaxy blue');
    expect(normalizeMaterialName('PETG Bottle Green')).toBe('bottle green');
  });

  it('keeps a name that is nothing but a type code', () => {
    expect(normalizeMaterialName('PLA')).toBe('pla');
  });
});

const subject: DuplicateSubject = {
  id: 'new',
  manufacturer: 'Sunlu',
  name: 'Galaxy Blue',
  filamentType: 'PLA',
  color: '#23407A',
};

function cand(
  id: string,
  name: string,
  fields: Partial<DuplicateSubject> = {}
): DuplicateSubject {
  return {
    id,
    manufacturer: 'Sunlu',
    name,
    filamentType: 'PLA',
    color: null,
    ...fields,
  };
}

describe('findDuplicateCandidates', () => {
  it('matches the ReviewQueue board: same name, close colour, similar', () => {
    const matches = findDuplicateCandidates(subject, [
      cand('sparkle', 'Sparkle Blue', { color: '#2F4F9A' }),
      cand('dark', 'Galaxy Dark Blue', { color: '#243F7C' }),
      cand('petg', 'Galaxy Blue', { filamentType: 'PETG', color: '#1F3A75' }),
      cand('orange', 'Silk Orange', { color: '#F26B21' }),
    ]);
    expect(matches.map((m) => [m.candidate.id, m.reason])).toEqual([
      ['petg', 'same-name'],
      ['dark', 'close-color'],
      ['sparkle', 'similar'],
    ]);
    expect(matches[1].deltaE).toBeLessThan(3);
    expect(matches[2].deltaE).toBeGreaterThan(3);
  });

  it('never returns the subject itself', () => {
    expect(findDuplicateCandidates(subject, [{ ...subject }])).toEqual([]);
  });

  it('matches names case- and type-insensitively across manufacturers', () => {
    const matches = findDuplicateCandidates(subject, [
      cand('x', 'GALAXY BLUE pla', { manufacturer: 'sunlu ' }),
      cand('y', 'Galaxy Blue', { manufacturer: 'Elegoo' }),
    ]);
    expect(matches.map((m) => [m.candidate.id, m.reason])).toEqual([
      ['x', 'same-name'],
      ['y', 'similar'],
    ]);
  });

  it('only uses colour within the same manufacturer and filament type', () => {
    const matches = findDuplicateCandidates(subject, [
      cand('other-mfr', 'Deep Ocean', {
        manufacturer: 'Elegoo',
        color: '#23407A',
      }),
      cand('other-type', 'Deep Ocean', {
        filamentType: 'PETG',
        color: '#23407A',
      }),
    ]);
    expect(matches).toEqual([]);
  });

  it('flags overlapping names as similar', () => {
    const matches = findDuplicateCandidates(subject, [
      cand('sub', 'Galaxy Blue Sparkle'),
      cand('one-token', 'Blue'),
      cand('unrelated', 'Silk Gold'),
    ]);
    expect(matches.map((m) => m.candidate.id)).toEqual(['sub', 'one-token']);
    expect(matches.every((m) => m.reason === 'similar')).toBe(true);
  });

  it('ignores missing or invalid colours rather than guessing', () => {
    const matches = findDuplicateCandidates({ ...subject, color: null }, [
      cand('a', 'Deep Ocean', { color: '#23407A' }),
      cand('b', 'Midnight', { color: 'not-a-colour' }),
    ]);
    expect(matches).toEqual([]);
  });

  it('ranks by reason, then colour distance, and honours the limit', () => {
    const matches = findDuplicateCandidates(
      subject,
      [
        cand('far', 'Navy', { color: '#3A5BA8' }),
        cand('near', 'Ink', { color: '#26437D' }),
        cand('name', 'Galaxy Blue', { filamentType: 'PETG' }),
      ],
      { limit: 2 }
    );
    expect(matches.map((m) => m.candidate.id)).toEqual(['name', 'near']);
  });
});

describe('findSpoolTypeDuplicateCandidates', () => {
  const subject = {
    id: 'subject',
    manufacturer: 'Polymaker',
    name: 'Cardboard 1 kg',
    emptyWeightGrams: 140,
  };
  const cand = (
    id: string,
    name: string,
    emptyWeightGrams: number,
    manufacturer = 'Polymaker'
  ) => ({ id, manufacturer, name, emptyWeightGrams });

  it('flags the same name at the same manufacturer, case and punctuation folded', () => {
    const [match] = findSpoolTypeDuplicateCandidates(subject, [
      cand('a', 'cardboard, 1 KG', 230),
    ]);
    expect(match).toMatchObject({ reason: 'same-name', weightDelta: 90 });
  });

  it('flags a near-identical empty weight or overlapping name as similar', () => {
    const matches = findSpoolTypeDuplicateCandidates(subject, [
      cand('weight', 'Plastic reel', 143),
      cand('name', 'Cardboard 1 kg (2022+)', 180),
      cand('other', 'Plastic 3 kg', 520),
    ]);
    expect(matches.map((m) => [m.candidate.id, m.reason])).toEqual([
      ['weight', 'similar'],
      ['name', 'similar'],
    ]);
  });

  it('never matches across manufacturers — every brand has a "Cardboard 1 kg"', () => {
    expect(
      findSpoolTypeDuplicateCandidates(subject, [
        cand('x', 'Cardboard 1 kg', 140, 'Extrudr'),
      ])
    ).toEqual([]);
  });

  it('reads "1kg" and "1 kg" as the same name', () => {
    const [match] = findSpoolTypeDuplicateCandidates(subject, [
      cand('a', 'Cardboard 1kg', 141),
    ]);
    expect(match.reason).toBe('same-name');
  });

  it('skips the subject itself', () => {
    expect(findSpoolTypeDuplicateCandidates(subject, [{ ...subject }])).toEqual(
      []
    );
  });
});
