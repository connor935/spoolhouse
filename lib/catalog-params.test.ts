import { describe, expect, it } from 'vitest';
import {
  materialCatalogSearch,
  parseMaterialCatalogParams,
} from '@/lib/catalog-params';

describe('parseMaterialCatalogParams', () => {
  it('reads q, a comma list of types, status and property ranges', () => {
    expect(
      parseMaterialCatalogParams({
        q: 'galaxy',
        type: 'PLA,PETG',
        status: 'pending',
        props: 'prop-density:1.2:1.3',
      })
    ).toEqual({
      q: 'galaxy',
      filamentTypes: ['PLA', 'PETG'],
      status: 'pending',
      constraints: [
        {
          id: expect.any(String),
          propertyId: 'prop-density',
          min: 1.2,
          max: 1.3,
        },
      ],
    });
  });

  it('keeps old single-type links working and ignores repeated params', () => {
    expect(parseMaterialCatalogParams({ type: 'PLA' }).filamentTypes).toEqual([
      'PLA',
    ]);
    expect(parseMaterialCatalogParams({ q: ['a', 'b'] }).q).toBe('');
    expect(parseMaterialCatalogParams({})).toEqual({
      q: '',
      filamentTypes: [],
      status: null,
      constraints: [],
    });
  });
});

describe('materialCatalogSearch', () => {
  it('round-trips through the parser and drops empty fields', () => {
    const filters = parseMaterialCatalogParams({
      q: ' red ',
      type: 'PLA,PETG',
      props: 'prop-density:1.2:',
    });
    const search = materialCatalogSearch(filters);
    expect(search).toBe('q=red&type=PLA%2CPETG&props=prop-density%3A1.2%3A');
    expect(
      parseMaterialCatalogParams(
        Object.fromEntries(new URLSearchParams(search))
      )
    ).toEqual({ ...filters, q: 'red' });
    expect(
      materialCatalogSearch({
        q: '',
        filamentTypes: [],
        status: null,
        constraints: [],
      })
    ).toBe('');
  });
});
