import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';

import * as stories from './lend-request-card.stories';

const { Incoming, IncomingPending, Outgoing, RequestsSection } =
  composeStories(stories);

describe('LendRequestCard', () => {
  it('shows who wants which spool, where and how much is left', () => {
    render(<Incoming />);
    const card = screen.getByRole('article', {
      name: 'Anna Weber wants #03 Prusa Orange',
    });
    expect(card).toHaveTextContent('Print Farm Friends');
    expect(card).toHaveTextContent('3 h ago');
    expect(card).toHaveTextContent('655 g');
  });

  it('approves and declines incoming requests', async () => {
    const onApprove = fn();
    const onDecline = fn();
    render(<Incoming onApprove={onApprove} onDecline={onDecline} />);
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(onApprove).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Decline' }));
    expect(onDecline).toHaveBeenCalledOnce();
  });

  it('disables both actions while one runs', () => {
    render(<IncomingPending />);
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeDisabled();
  });

  it('lets the requester cancel, but never approve, their own request', async () => {
    const onCancel = fn();
    render(<Outgoing onCancel={onCancel} />);
    expect(screen.getByText('Awaiting approval')).toBeInTheDocument();
    expect(
      screen.getByText('#05 Galaxy Black').parentElement
    ).toHaveTextContent('from Jonas Brandt');
    expect(
      screen.queryByRole('button', { name: 'Approve' })
    ).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('composes the Borrows 01 section', () => {
    render(<RequestsSection />);
    expect(
      screen.getByRole('heading', { name: 'Requests for your spools' })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });
});
