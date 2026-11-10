import { composeStories } from '@storybook/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './dialog.stories';

const { Closed, Open } = composeStories(stories);

describe('Dialog', () => {
  it('opens from its trigger with an accessible title and description', async () => {
    render(<Closed />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete spool' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Delete this spool?',
    });
    expect(dialog).toHaveAccessibleDescription("This can't be undone.");
  });

  it('closes on Escape without confirming', async () => {
    const onConfirm = fn();
    render(<Open onConfirm={onConfirm} />);
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('runs the confirm action and closes', async () => {
    const onConfirm = fn();
    render(<Open onConfirm={onConfirm} />);
    const dialog = await screen.findByRole('dialog');
    const confirm = Array.from(dialog.querySelectorAll('button')).find(
      (b) => b.textContent === 'Delete spool'
    );
    expect(confirm).toBeDefined();
    await userEvent.click(confirm!);
    expect(onConfirm).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
  });

  it('has a labelled close button', async () => {
    render(<Open />);
    await screen.findByRole('dialog');
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });
});
