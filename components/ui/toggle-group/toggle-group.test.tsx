import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './toggle-group.stories';

const { WithCounts } = composeStories(stories);

describe('ToggleGroup', () => {
  it('shows counts in the item names', () => {
    render(<WithCounts />);
    expect(screen.getByRole('button', { name: 'In stock 14' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('switches the single selected value', async () => {
    const onValueChange = fn();
    render(<WithCounts onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Empty 5' }));

    expect(onValueChange).toHaveBeenLastCalledWith(
      ['empty'],
      expect.anything()
    );
    expect(screen.getByRole('button', { name: 'Empty 5' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'In stock 14' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('keeps one item pressed when the active one is clicked again', async () => {
    const onValueChange = fn();
    render(<WithCounts onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'In stock 14' }));
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'In stock 14' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('moves focus with arrow keys and selects with Enter', async () => {
    const onValueChange = fn();
    render(<WithCounts onValueChange={onValueChange} />);
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'In stock 14' })).toHaveFocus();

    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    const all = screen.getByRole('button', { name: 'All 19' });
    expect(all).toHaveFocus();

    await userEvent.keyboard('{Enter}');
    expect(onValueChange).toHaveBeenLastCalledWith(['all'], expect.anything());
  });
});
