import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as stories from './properties-view.stories';

const { Default, Empty } = composeStories(stories);

describe('PropertiesView', () => {
  it('sums definitions and values in the header', () => {
    render(<Default />);
    expect(
      screen.getByText('8 definitions · 4,404 values')
    ).toBeInTheDocument();
  });

  it('lists each definition with key, unit, type and usage', () => {
    render(<Default />);
    const row = screen.getByRole('row', { name: /Extruder temp/ });
    expect(row).toHaveTextContent('extruder_temp');
    expect(row).toHaveTextContent('°C');
    expect(row).toHaveTextContent('range');
    expect(row).toHaveTextContent('412 material values');
  });

  it('opens create and edit', async () => {
    const user = userEvent.setup();
    render(<Default />);
    await user.click(screen.getByRole('button', { name: 'New property' }));
    expect(Default.args.onCreate).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Edit Hardness' }));
    expect(Default.args.onEdit).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'hardness' })
    );
  });

  it('only deletes definitions no material value uses', async () => {
    const user = userEvent.setup();
    render(<Default />);
    expect(
      screen.getByRole('button', { name: 'Delete Density' })
    ).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Delete Finish' }));
    expect(Default.args.onDelete).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'finish' })
    );
  });

  it('explains every value type', () => {
    render(<Default />);
    const types = screen.getByRole('region', { name: 'Value types' });
    expect(within(types).getByText('list')).toBeVisible();
    expect(
      within(types).getByText('Numbers separated by commas, e.g. 1.75, 2.85')
    ).toBeVisible();
  });

  it('shows an empty state without definitions', () => {
    render(<Empty />);
    expect(screen.getByText('No properties yet')).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
