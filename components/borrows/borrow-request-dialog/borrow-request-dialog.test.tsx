import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';

import * as stories from './borrow-request-dialog.stories';

const { Default, WithoutSpool, Pending, Closed } = composeStories(stories);

describe('BorrowRequestDialog', () => {
  it('shows the request with group, time and the requested spool', async () => {
    render(<Default />);
    const dialog = await screen.findByRole('dialog', {
      name: 'Borrow request',
    });
    expect(dialog).toHaveAccessibleDescription(
      'Anna Weber wants to borrow one of your spools.'
    );
    expect(dialog).toHaveTextContent('Print Farm Friends · just now');
    expect(dialog).toHaveTextContent('#03');
    expect(dialog).toHaveTextContent('Prusa Orange');
    expect(dialog).toHaveTextContent('PETG');
    expect(dialog).toHaveTextContent('B1');
    expect(dialog).toHaveTextContent('655 g');
    expect(
      screen.getByRole('meter', { name: 'Prusa Orange filament left' })
    ).toHaveAttribute('aria-valuenow', '66');
    // Domain rule: lending never takes the owner's edit rights away.
    expect(dialog).toHaveTextContent(
      "While it's lent, Anna re-weighs it; only you can mark it returned."
    );
  });

  it('names just the material when the spool is not loaded', async () => {
    render(<WithoutSpool />);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleDescription(
      'Lena Schulz wants to borrow your Silk Gold #2 in Makerspace Kiel.'
    );
    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
  });

  it.each([
    ['Approve', 'onApprove'],
    ['Decline', 'onDecline'],
    ['Later', 'onClose'],
  ] as const)('%s calls %s', async (name, callback) => {
    const spy = fn();
    render(<Default {...{ [callback]: spy }} />);
    await userEvent.click(await screen.findByRole('button', { name }));
    expect(spy).toHaveBeenCalledOnce();
  });

  it('closes on Escape without answering', async () => {
    const onClose = fn();
    const onApprove = fn();
    const onDecline = fn();
    render(
      <Default onClose={onClose} onApprove={onApprove} onDecline={onDecline} />
    );
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
    expect(onApprove).not.toHaveBeenCalled();
    expect(onDecline).not.toHaveBeenCalled();
  });

  it('disables the answers while one runs, but not "Later"', async () => {
    render(<Pending />);
    expect(
      await screen.findByRole('button', { name: 'Working…' })
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Later' })).toBeEnabled();
  });

  it('renders nothing without a request', () => {
    render(<Closed />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
