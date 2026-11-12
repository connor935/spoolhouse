import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as stories from './activity-item.stories';

const { Weigh, UnreadRequest, Borrow } = composeStories(stories);

describe('ActivityItem', () => {
  it('renders time, emphasised text and the kind tag', () => {
    render(<Weigh />);
    const item = screen.getByRole('listitem');
    expect(item.querySelector('time')).toHaveAttribute(
      'datetime',
      '2026-11-10T14:02:00Z'
    );
    expect(screen.getByText('14:02')).toBeInTheDocument();
    expect(screen.getByText('Galaxy Black #1').tagName).toBe('STRONG');
    expect(screen.getByText('Weigh')).toHaveAttribute('data-slot', 'badge');
    expect(item).not.toHaveAttribute('data-unread');
  });

  it('marks unread items visibly and for screen readers', () => {
    render(<UnreadRequest />);
    const item = screen.getByRole('listitem');
    expect(item).toHaveAttribute('data-unread', 'true');
    expect(item).toHaveTextContent(/Unread, 11:40/);
    expect(screen.getByText('Request')).toHaveClass('text-accent-ink');
  });

  it('uses a muted tag for borrows', () => {
    render(<Borrow />);
    expect(screen.getByText('Borrow')).toHaveClass('text-muted-foreground');
  });
});
