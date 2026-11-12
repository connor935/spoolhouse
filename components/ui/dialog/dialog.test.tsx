import { composeStories } from '@storybook/react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './dialog.stories';

const { Closed, Open, DestructiveConfirm, BorrowRequest } =
  composeStories(stories);

describe('Dialog', () => {
  it('opens from its trigger with an accessible title and description', async () => {
    render(<Closed />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Edit spool type' })
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Edit spool type',
    });
    expect(dialog).toHaveAccessibleDescription(
      'Your request is still pending; changes apply immediately.'
    );
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

  it('has a labelled close button', async () => {
    render(<Open />);
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByRole('button', { name: 'Close' })
    ).toBeInTheDocument();
  });

  it('renders the kicker above the title in a ruled header', async () => {
    render(<Open />);
    const dialog = await screen.findByRole('dialog');
    const header = dialog.querySelector('[data-slot=dialog-header]');
    expect(header).toHaveClass('border-b-2', 'border-ink');
    expect(header?.firstElementChild).toHaveTextContent(
      'Catalog · pending review'
    );
  });

  describe('destructive confirm', () => {
    it('runs the confirm action and closes', async () => {
      const onConfirm = fn();
      render(<DestructiveConfirm onConfirm={onConfirm} />);
      const dialog = await screen.findByRole('dialog', {
        name: 'Delete this spool?',
      });
      await userEvent.click(
        within(dialog).getByRole('button', { name: 'Delete spool' })
      );
      expect(onConfirm).toHaveBeenCalledOnce();
      await waitFor(() =>
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      );
    });

    it('uses the plain header without a close button', async () => {
      render(<DestructiveConfirm />);
      const dialog = await screen.findByRole('dialog');
      expect(dialog.querySelector('[data-slot=dialog-header]')).not.toHaveClass(
        'border-b-2'
      );
      expect(
        within(dialog).queryByRole('button', { name: 'Close' })
      ).not.toBeInTheDocument();
    });
  });

  it('lays out the borrow request with kicker, body and footer actions', async () => {
    const onConfirm = fn();
    render(<BorrowRequest onConfirm={onConfirm} />);
    const dialog = await screen.findByRole('dialog', {
      name: 'Borrow request',
    });
    expect(within(dialog).getByText('Print Farm Friends · just now')).toBe(
      dialog.querySelector('[data-slot=dialog-kicker]')
    );
    expect(within(dialog).getByText('Prusa Orange')).toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Approve' })
    );
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
