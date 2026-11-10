import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as stories from './activity-list.stories';

const { Default, Empty } = composeStories(stories);

describe('ActivityList', () => {
  it('renders every entry in order as a named list', () => {
    render(<Default />);
    const list = screen.getByRole('list', { name: 'Recent activity' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(items[0]).toHaveTextContent('Weighed Galaxy Black #1');
    expect(items[1]).toHaveAttribute('data-unread', 'true');
    expect(within(items[2]).getByText('Borrow')).toBeInTheDocument();
  });

  it('shows an empty state without entries', () => {
    render(<Empty />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByText(/Nothing happened yet/)).toBeInTheDocument();
  });
});
