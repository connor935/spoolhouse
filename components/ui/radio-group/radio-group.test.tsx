import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './radio-group.stories';

const { Cards, CardsDisabled, Plain } = composeStories(stories);

describe('RadioGroup', () => {
  it('names each card by its title and describes it', () => {
    render(<Cards />);
    const card = screen.getByRole('radio', { name: 'Share all materials' });
    expect(card).toHaveAccessibleDescription(
      'Every spool you own is visible to this group.'
    );
    expect(
      screen.getByRole('radio', { name: 'Share only selected materials' })
    ).toBeChecked();
  });

  it('selects a card on click', async () => {
    const onValueChange = fn();
    render(<Cards onValueChange={onValueChange} />);
    await userEvent.click(screen.getByText('Share all materials'));
    expect(
      screen.getByRole('radio', { name: 'Share all materials' })
    ).toBeChecked();
    expect(onValueChange).toHaveBeenLastCalledWith('all', expect.anything());
  });

  it('moves the selection with arrow keys', async () => {
    const onValueChange = fn();
    render(<Cards onValueChange={onValueChange} />);
    await userEvent.tab();
    expect(
      screen.getByRole('radio', { name: 'Share only selected materials' })
    ).toHaveFocus();

    await userEvent.keyboard('{ArrowDown}');
    const last = screen.getByRole('radio', {
      name: 'Share all except selected materials',
    });
    expect(last).toHaveFocus();
    expect(last).toBeChecked();
    expect(onValueChange).toHaveBeenLastCalledWith(
      'blacklist',
      expect.anything()
    );
  });

  it('ignores clicks while disabled', async () => {
    const onValueChange = fn();
    render(<CardsDisabled onValueChange={onValueChange} />);
    await userEvent.click(screen.getByText('Share all materials'));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('works as plain radios with wrapping labels', async () => {
    render(<Plain />);
    await userEvent.click(screen.getByText('Cost'));
    expect(screen.getByRole('radio', { name: 'Cost' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Grams' })).not.toBeChecked();
  });
});
