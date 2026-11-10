import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';

import { ME, stock } from '@/stories/fixtures/social';

import { groupStockState } from './group-stock-row';
import * as stories from './group-stock-row.stories';

const {
  Available,
  AvailablePending,
  RequestedByYou,
  RequestedByOther,
  WithYou,
  LentToOther,
  Own,
  OwnRequested,
  OwnLent,
  MaterialGroup,
} = composeStories(stories);

const row = () =>
  document.querySelector('[data-slot="group-stock-row"]') as HTMLElement;

describe('GroupStockRow', () => {
  it('shows owner, number, weight and meter', () => {
    render(<Available />);
    expect(row()).toHaveTextContent('Anna Weber');
    expect(row()).toHaveTextContent('#02');
    expect(row()).toHaveTextContent('1.00 kg');
    expect(
      screen.getByRole('meter', {
        name: "Anna Weber's spool #02 filament left",
      })
    ).toBeInTheDocument();
  });

  it('lets a member request a free spool', async () => {
    const onRequest = fn();
    render(<Available onRequest={onRequest} />);
    await userEvent.click(screen.getByRole('button', { name: 'Request' }));
    expect(onRequest).toHaveBeenCalledOnce();
  });

  it('disables Request while it runs', () => {
    render(<AvailablePending />);
    expect(screen.getByRole('button', { name: 'Requesting…' })).toBeDisabled();
  });

  it('lets the requester cancel their own pending request', async () => {
    const onCancelRequest = fn();
    render(<RequestedByYou onCancelRequest={onCancelRequest} />);
    expect(screen.getByText('Requested · pending')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Request' })
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancelRequest).toHaveBeenCalledOnce();
  });

  it.each([
    ['someone else requested it', RequestedByOther, 'Requested by Tom'],
    ['it is with you', WithYou, 'With you since 07 Nov'],
    ['it is lent to someone else', LentToOther, 'Lent · Lena'],
    ['it is yours', Own, 'Your spool'],
    ['someone requested your spool', OwnRequested, 'Requested by Anna'],
  ])('shows a status but no action when %s', (_, Story, text) => {
    render(<Story />);
    expect(screen.getByText(text)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('lets the owner mark their lent spool returned', async () => {
    const onMarkReturned = fn();
    render(<OwnLent onMarkReturned={onMarkReturned} />);
    expect(row()).toHaveTextContent('You');
    expect(screen.getByText('Lent · Jonas')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Mark returned' })
    );
    expect(onMarkReturned).toHaveBeenCalledOnce();
  });

  it('composes a material group with every state', () => {
    render(<MaterialGroup />);
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
    expect(screen.getAllByRole('button', { name: 'Request' })).toHaveLength(1);
  });
});

describe('groupStockState', () => {
  it('resolves the viewer side: owner, requester, borrower, bystander', () => {
    expect(groupStockState(stock.own, ME.id)).toEqual({ kind: 'own' });
    expect(groupStockState(stock.ownLent, ME.id)).toEqual({
      kind: 'own-lent',
      borrowerName: 'Jonas Brandt',
    });
    expect(groupStockState(stock.ownRequested, ME.id)).toEqual({
      kind: 'own-requested',
      borrowerName: 'Anna Weber',
    });
    expect(groupStockState(stock.available, ME.id)).toEqual({
      kind: 'available',
    });
    expect(groupStockState(stock.requestedByYou, ME.id)).toEqual({
      kind: 'requested-by-you',
    });
    expect(groupStockState(stock.withYou, ME.id)).toEqual({ kind: 'with-you' });
    // The same spool, seen by its owner.
    expect(
      groupStockState(stock.requestedByYou, stock.requestedByYou.ownerId)
    ).toEqual({
      kind: 'own-requested',
      borrowerName: ME.name,
    });
  });

  it('puts an active lend before a pending request', () => {
    const both = {
      ...stock.available,
      lentTo: { lendId: 'a', borrowerId: 'x', borrowerName: 'Xena' },
      pendingRequest: { lendId: 'b', borrowerId: ME.id, borrowerName: ME.name },
    };
    expect(groupStockState(both, ME.id)).toEqual({
      kind: 'lent-to-other',
      borrowerName: 'Xena',
    });
  });
});
