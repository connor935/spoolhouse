import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';

import { notifications } from '@/stories/fixtures/social';

import { isActionableNotification } from './notification-row';
import * as stories from './notification-row.stories';

const { Actionable, Approved, Declined, ReadReturned, AnsweredRequest, List } =
  composeStories(stories);

const row = () =>
  document.querySelector('[data-slot="notification-row"]') as HTMLElement;

describe('NotificationRow', () => {
  it('reads as a sentence with time and an unread marker', () => {
    render(<Actionable />);
    expect(row()).toHaveTextContent(
      'Anna Weber requested to borrow Prusa Orange #3 in Print Farm Friends'
    );
    expect(screen.getByText('just now').tagName).toBe('TIME');
    expect(screen.getByText('Unread')).toBeInTheDocument();
    expect(row()).toHaveAttribute('data-unread', 'true');
  });

  it('responds to an open borrow request', async () => {
    const onRespond = fn();
    render(<Actionable onRespond={onRespond} />);
    await userEvent.click(screen.getByRole('button', { name: 'Respond' }));
    expect(onRespond).toHaveBeenCalledOnce();
  });

  it('shows the lend state instead of Respond once a request is answered', () => {
    render(<AnsweredRequest />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('shows "Pending" for an open request when there is no way to respond', () => {
    render(<Actionable onRespond={undefined} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it.each([
    [
      'approved',
      Approved,
      'Approved',
      'Mia Koch approved your request for Basic Cyan #4',
    ],
    [
      'declined',
      Declined,
      'Declined',
      'Jonas Brandt declined your request for Graphite #7',
    ],
    [
      'returned',
      ReadReturned,
      'Returned',
      'Tom Richter marked Prusa Orange #2 as returned',
    ],
  ])('tags a %s notification', (_, Story, tag, text) => {
    render(<Story />);
    expect(screen.getByText(tag)).toBeInTheDocument();
    expect(row()).toHaveTextContent(text);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('mutes read rows', () => {
    render(<ReadReturned />);
    expect(row()).not.toHaveAttribute('data-unread');
    expect(screen.queryByText('Unread')).not.toBeInTheDocument();
  });

  it('composes the Notifications board', () => {
    render(<List />);
    expect(screen.getAllByRole('listitem')).toHaveLength(6);
    expect(screen.getAllByRole('button', { name: 'Respond' })).toHaveLength(2);
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(
      screen.getByText('Only borrow activity creates notifications.')
    ).toBeInTheDocument();
  });
});

describe('isActionableNotification', () => {
  it('is true only for a request that is still open', () => {
    expect(isActionableNotification(notifications.requested)).toBe(true);
    expect(isActionableNotification(notifications.answered)).toBe(false);
    expect(isActionableNotification(notifications.approved)).toBe(false);
    expect(
      isActionableNotification({
        ...notifications.requested,
        notification: { ...notifications.requested.notification, lendId: null },
      })
    ).toBe(false);
  });
});
