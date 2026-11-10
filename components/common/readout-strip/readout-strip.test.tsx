import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { formatMoney, formatWeight } from '@/lib/filament';
import { readoutParts } from './readout-strip';
import * as stories from './readout-strip.stories';

const { Default, AsLinks, Tones } = composeStories(stories);

describe('readoutParts', () => {
  it.each([
    [formatWeight(8090), { value: '8.09', unit: 'kg' }],
    [formatWeight(410), { value: '410', unit: 'g' }],
    [formatMoney(21460), { value: '€214', unit: '.60' }],
    ['14', { value: '14' }],
    ['~7 wk', { value: '~7', unit: 'wk' }],
    ['—', { value: '—' }],
  ])('%s → %o', (input, expected) => {
    expect(readoutParts(input)).toEqual(expected);
  });
});

describe('ReadoutStrip', () => {
  it('is a labelled region holding the readouts', () => {
    render(<Default />);
    expect(screen.getByRole('region', { name: 'Key figures' })).toBeInTheDocument();
    expect(screen.getByText('Used · 30 days')).toBeInTheDocument();
  });

  it('sets the unit in <small> next to the value', () => {
    render(<Default />);
    const unit = screen.getAllByText('kg')[0];
    expect(unit.tagName).toBe('SMALL');
    expect(unit.parentElement).toHaveTextContent('1.18kg');
  });

  it('renders readouts with href as links', () => {
    render(<AsLinks />);
    expect(
      screen.getByRole('link', { name: /Spools in stock/ })
    ).toHaveAttribute('href', '/inventory');
  });

  it('colours the sub-line by tone', () => {
    render(<Tones />);
    expect(screen.getByText('+18 % vs. prev.')).toHaveAttribute('data-tone', 'negative');
    expect(screen.getByText('+18 % vs. prev.').className).toContain('text-destructive');
  });
});
