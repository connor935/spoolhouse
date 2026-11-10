import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as stories from './runway-table.stories';

const { ByMaterial, Unsorted, ByType, OutOfStock, Empty } =
  composeStories(stories);

const bodyRows = () => screen.getAllByRole('row').slice(1);
const names = () =>
  bodyRows().map((r) => within(r).getAllByRole('cell')[0].textContent);

describe('RunwayTable', () => {
  it('lists materials with usage, stock and runway text', () => {
    render(<ByMaterial />);
    expect(
      screen.getAllByRole('columnheader').map((h) => h.textContent)
    ).toEqual(['Material', 'Used · 90 d', 'In stock', 'Runway · 12 mo']);
    const cyan = within(bodyRows()[0]).getAllByRole('cell');
    expect(cyan[0]).toHaveTextContent('Basic Cyan');
    expect(cyan[0]).toHaveTextContent('PLA');
    expect(cyan[1]).toHaveTextContent('640 g');
    expect(cyan[2]).toHaveTextContent('142 g');
    expect(cyan[3]).toHaveTextContent('3 wk');
  });

  it('formats every runway band', () => {
    render(<ByMaterial />);
    const runways = bodyRows().map(
      (r) => within(r).getAllByRole('cell')[3].textContent
    );
    expect(runways).toEqual([
      '3 wk',
      '6 wk',
      '10 wk',
      '6 mo',
      '1 yr',
      '> 1 yr',
      'No recent use',
      'No recent use',
    ]);
  });

  it('sorts so the material that runs out first is on top', () => {
    render(<Unsorted />);
    expect(names()[0]).toContain('Basic Cyan');
    expect(names().at(-1)).not.toContain('Basic Cyan');
  });

  it('flags a short runway with a destructive tag and meter', () => {
    const { container } = render(<ByMaterial />);
    const tag = screen.getByText('3 wk');
    expect(tag).toHaveClass('bg-destructive');
    const meters = container.querySelectorAll('[data-slot="runway-meter"] i');
    expect(meters[0]).toHaveClass('bg-destructive');
    expect(meters[1]).toHaveClass('bg-accent');
  });

  it('puts out-of-stock rows first', () => {
    render(<OutOfStock />);
    expect(names()[0]).toContain('Matte Charcoal');
    expect(screen.getByText('Out of stock')).toBeInTheDocument();
  });

  it('renders the compact by-type variant', () => {
    render(<ByType />);
    expect(screen.getAllByRole('columnheader').at(-1)).toHaveTextContent(
      'Lasts'
    );
    expect(names()).toEqual(['PETG', 'PLA', 'ASA']);
    expect(screen.getByText('10 wk')).toBeInTheDocument();
    expect(screen.getByText('Idle')).toBeInTheDocument();
  });

  it('shows an empty row without data', () => {
    render(<Empty />);
    expect(screen.getByText(/No filament in stock/)).toBeInTheDocument();
  });
});
