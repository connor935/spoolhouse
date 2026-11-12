import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as stories from './table.stories';

const { Default, ScrollRegion } = composeStories(stories);

describe('Table', () => {
  it('renders column headers and cells', () => {
    render(<Default />);
    const table = screen.getByRole('table');
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent)
    ).toEqual(['Manufacturer', 'Type', 'Spools', 'Left']);
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(within(table).getByRole('cell', { name: 'Extrudr' })).toBeVisible();
  });

  it('right-aligns numeric columns and leaves text columns left', () => {
    render(<Default />);
    const spools = screen.getByRole('columnheader', { name: 'Spools' });
    const manufacturer = screen.getByRole('columnheader', {
      name: 'Manufacturer',
    });
    expect(spools).toHaveClass('text-right');
    expect(manufacturer).toHaveClass('text-left');
    expect(manufacturer).not.toHaveClass('text-right');
    expect(screen.getByRole('cell', { name: '2.8 kg' })).toHaveClass(
      'text-right',
      'tabular-nums'
    );
    expect(screen.getByRole('cell', { name: 'PLA' })).not.toHaveClass(
      'text-right'
    );
  });

  it('draws the ink rule under the header row', () => {
    render(<Default />);
    for (const th of screen.getAllByRole('columnheader')) {
      expect(th).toHaveClass('border-b', 'border-ink');
    }
  });

  it('is a plain scroll container by default', () => {
    render(<Default />);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('names an overflowing scroll container and makes it focusable', () => {
    render(<ScrollRegion />);
    const region = screen.getByRole('region', {
      name: 'Spools by manufacturer',
    });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(within(region).getByRole('table')).toBeInTheDocument();
  });
});
