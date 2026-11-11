import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import type { FilterValue } from '@/lib/filter-value';
import * as stories from './filter-fields.stories';

const { Panel, Prefilled, GroupStock, Catalog, Sheet } =
  composeStories(stories);

const lastValue = (spy: ReturnType<typeof fn>) =>
  spy.mock.lastCall?.[0] as FilterValue;

describe('FilterFields', () => {
  it('emits whole values with types in their offered order', async () => {
    const onChange = fn();
    render(<Panel onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'PETG' }));
    await userEvent.click(screen.getByRole('button', { name: 'PLA' }));
    expect(lastValue(onChange)).toEqual({
      filamentTypes: ['PLA', 'PETG'],
      minLeftGrams: null,
      hideLent: false,
      propertyConstraints: [],
    });
    expect(screen.getByRole('button', { name: 'PLA' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await userEvent.click(screen.getByRole('button', { name: 'PETG' }));
    expect(lastValue(onChange).filamentTypes).toEqual(['PLA']);
  });

  it('emits the minimum remaining as whole grams', async () => {
    const onChange = fn();
    render(<Panel onChange={onChange} />);
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Min. remaining (g)' }),
      '300'
    );
    expect(lastValue(onChange).minLeftGrams).toBe(300);
  });

  it('emits property ranges and keeps a decimal comma while typing', async () => {
    const onChange = fn();
    render(<Panel onChange={onChange} />);
    const min = screen.getByRole('textbox', {
      name: 'Minimum Density (g/cm³)',
    });
    await userEvent.type(min, '1,2');
    expect(min).toHaveValue('1,2');
    expect(lastValue(onChange).propertyConstraints).toEqual([
      { id: 'prop-density', propertyId: 'prop-density', min: 1.2, max: null },
    ]);

    await userEvent.clear(min);
    expect(lastValue(onChange).propertyConstraints).toEqual([]);
  });

  it('shows the given value', () => {
    render(<Prefilled />);
    expect(screen.getByRole('button', { name: 'PETG' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(
      screen.getByRole('textbox', { name: 'Min. remaining (g)' })
    ).toHaveValue('300');
    expect(
      screen.getByRole('textbox', { name: 'Maximum Density (g/cm³)' })
    ).toHaveValue('1.3');
  });

  it('skips text properties, which have no numeric range', () => {
    render(<Panel />);
    expect(screen.getByText('Extruder temp')).toBeInTheDocument();
    expect(screen.queryByText('Finish')).not.toBeInTheDocument();
  });

  it('offers hide lent only for group stock', async () => {
    const onChange = fn();
    const { unmount } = render(<Panel />);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    unmount();

    render(<GroupStock onChange={onChange} />);
    await userEvent.click(
      screen.getByRole('switch', { name: 'Hide lent spools' })
    );
    expect(lastValue(onChange).hideLent).toBe(true);
  });

  it('leaves out min remaining in the catalog', () => {
    render(<Catalog />);
    expect(
      screen.queryByRole('textbox', { name: 'Min. remaining (g)' })
    ).not.toBeInTheDocument();
  });

  it('labels each property on its own in the sheet layout', () => {
    render(<Sheet />);
    expect(screen.getByRole('group', { name: 'Density' })).toBeInTheDocument();
    expect(
      screen.getByRole('textbox', { name: 'Minimum Density (g/cm³)' })
    ).toHaveValue('1.2');
  });
});
