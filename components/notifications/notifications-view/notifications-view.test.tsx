import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as stories from './notifications-view.stories';

const { Default, Empty } = composeStories(stories);
const { items } = stories.default.args;

describe('NotificationsView', () => {
  it('renders one row per notification and counts the unread ones', () => {
    render(<Default />);
    const list = screen.getByRole('list', { name: 'Notifications' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(items.length);
    const unread = items.filter(
      (i) => i.item.notification.readAt === null
    ).length;
    expect(
      screen.getByText(`${unread} unread · now marked read`)
    ).toBeInTheDocument();
  });

  it('Respond hands the clicked notification to onRespond', async () => {
    const user = userEvent.setup();
    render(<Default />);
    const [first] = screen.getAllByRole('button', { name: /respond/i });
    await user.click(first);
    expect(Default.args.onRespond).toHaveBeenCalledWith(items[0].item);
  });

  it('shows an empty state without notifications', () => {
    render(<Empty />);
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
    expect(screen.getByText('All caught up')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
