import { composeStories } from '@storybook/react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { shortDate } from './lend-spool-label';
import * as stories from './lend-spool-label.stories';

const { Default, WithoutNumber, NoSwatch } = composeStories(stories);

const label = () =>
  document.querySelector('[data-slot="lend-spool-label"]') as HTMLElement;
const swatch = () => document.querySelector('[data-slot="swatch"]');

describe('LendSpoolLabel', () => {
  it('names the spool by number and material, with a decorative swatch', () => {
    render(<Default />);
    expect(label()).toHaveTextContent(/^#03 Prusa Orange$/);
    expect(swatch()).toHaveAttribute('aria-hidden', 'true');
  });

  it('falls back to the material name', () => {
    render(<WithoutNumber />);
    expect(label()).toHaveTextContent(/^Silk Gold$/);
  });

  it('can drop the swatch', () => {
    render(<NoSwatch />);
    expect(swatch()).toBeNull();
  });
});

describe('shortDate', () => {
  it('formats day and month in UTC', () => {
    expect(shortDate(new Date('2026-10-12T23:30:00Z'))).toBe('12 Oct');
    expect(shortDate(new Date('2026-11-07T00:00:00Z'))).toBe('07 Nov');
  });
});
