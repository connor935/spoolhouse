import { composeStories } from '@storybook/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './popover.stories';

const { Closed, ReweighPopover } = composeStories(stories);

describe('Popover', () => {
  it('opens from its trigger and closes on Escape, returning focus', async () => {
    render(<Closed />);
    const trigger = screen.getByRole('button', { name: 'Show details' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await userEvent.click(trigger);
    const popup = await screen.findByRole('dialog', { name: 'Drying' });
    expect(popup).toHaveAccessibleDescription(
      'PETG absorbs moisture. Dry at 65 °C for 4 h.'
    );
    expect(popup).toHaveClass('border-ink', 'shadow-pop');

    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    expect(trigger).toHaveFocus();
  });

  it('closes when clicking outside', async () => {
    render(<Closed />);
    await userEvent.click(screen.getByRole('button', { name: 'Show details' }));
    await screen.findByRole('dialog');
    await userEvent.click(document.body);
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
  });

  it('renders the re-weigh shell with a labelled weight field', async () => {
    const onSave = fn();
    render(<ReweighPopover onSave={onSave} />);
    await screen.findByRole('dialog', { name: 'Re-weigh #03 Galaxy Black' });
    expect(screen.getByLabelText('Measured total weight (g)')).toHaveValue(
      '1112'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledOnce();
  });
});
