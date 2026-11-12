import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import { EMPTY_FILTER_VALUE } from '@/lib/filter-value';
import * as stories from './filter-sheet.stories';

const { Inventory, Catalog } = composeStories(stories);

describe('FilterSheet', () => {
  it('is a dialog with the same fields as the panel', async () => {
    render(<Inventory />);
    const sheet = await screen.findByRole('dialog', { name: 'Filters' });
    expect(within(sheet).getByRole('button', { name: 'PLA' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(
      within(sheet).getByRole('textbox', { name: 'Min. remaining (g)' })
    ).toHaveValue('300');
  });

  it('closes from "Show N spools"', async () => {
    const onOpenChange = fn();
    render(<Inventory onOpenChange={onOpenChange} />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Show 6 spools' })
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('Clear all resets the value', async () => {
    const onChange = fn();
    render(<Inventory onChange={onChange} />);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Clear all' })
    );
    expect(onChange).toHaveBeenLastCalledWith(EMPTY_FILTER_VALUE);
    expect(screen.getByRole('button', { name: 'Clear all' })).toBeDisabled();
  });

  it('uses the singular noun for one result', async () => {
    render(<Catalog />);
    expect(
      await screen.findByRole('button', { name: 'Show 1 material' })
    ).toBeInTheDocument();
  });
});
