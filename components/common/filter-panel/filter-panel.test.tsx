import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import { EMPTY_FILTER_VALUE } from '@/lib/filter-value';
import * as stories from './filter-panel.stories';

const { Inventory, Empty, UnderToolbar } = composeStories(stories);

describe('FilterPanel', () => {
  it('Clear all resets every field', async () => {
    const onChange = fn();
    render(<Inventory onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }));

    expect(onChange).toHaveBeenLastCalledWith(EMPTY_FILTER_VALUE);
    expect(screen.getByRole('button', { name: 'PLA' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(
      screen.getByRole('textbox', { name: 'Min. remaining (g)' })
    ).toHaveValue('');
    expect(
      screen.getByRole('textbox', { name: 'Minimum Density (g/cm³)' })
    ).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Clear all' })).toBeDisabled();
  });

  it('disables Clear all when nothing is set', () => {
    render(<Empty />);
    expect(screen.getByRole('region', { name: 'Filters' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear all' })).toBeDisabled();
  });
});

describe('FilterPanel under the toolbar', () => {
  it('expands from the Filters button, which shows the active count', async () => {
    render(<UnderToolbar />);
    const toggle = screen.getByRole('button', { name: 'Filters 2 active' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByRole('region', { name: 'Filters' })
    ).not.toBeInTheDocument();

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveAttribute('aria-controls', 'catalog-filters');
    expect(screen.getByRole('region', { name: 'Filters' })).toHaveAttribute(
      'id',
      'catalog-filters'
    );
  });

  it('removing a chip clears that field in the panel', async () => {
    render(<UnderToolbar />);
    await userEvent.click(screen.getByRole('button', { name: /^Filters/ }));
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Remove filter Density 1.2–1.3 g/cm³',
      })
    );
    expect(
      screen.getByRole('textbox', { name: 'Maximum Density (g/cm³)' })
    ).toHaveValue('');
    expect(
      screen.getByRole('button', { name: 'Filters 1 active' })
    ).toBeInTheDocument();
  });
});
