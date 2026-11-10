import { composeStories } from '@storybook/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './reweigh-popover.stories';

const { Closed, Open } = composeStories(stories);

describe('ReweighPopover', () => {
  it('opens from the tile with its title and the form', async () => {
    render(<Closed />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Re-weigh spool #03' })
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Re-weigh #03 Galaxy Black',
    });
    expect(dialog).toContainElement(
      screen.getByRole('textbox', { name: 'Measured total weight (g)' })
    );
  });

  it('saves and closes', async () => {
    const onSave = fn();
    render(<Open onSave={onSave} />);
    const input = await screen.findByRole('textbox', {
      name: 'Measured total weight (g)',
    });
    await userEvent.clear(input);
    await userEvent.type(input, '1112{Enter}');
    expect(onSave).toHaveBeenCalledWith(1112);
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
  });

  it('closes from its close button without saving', async () => {
    const onSave = fn();
    render(<Open onSave={onSave} />);
    await screen.findByRole('dialog');
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    expect(onSave).not.toHaveBeenCalled();
  });
});
