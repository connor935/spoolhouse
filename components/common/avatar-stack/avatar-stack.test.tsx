import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as stories from './avatar-stack.stories';

const { Default, Overflow } = composeStories(stories);

describe('AvatarStack', () => {
  it('shows everyone when they fit', () => {
    render(<Default />);
    const list = screen.getByRole('list', { name: 'Members' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
    expect(within(list).queryByText(/^\+/)).toBeNull();
  });

  it('collapses the rest into "+N" in the last slot', () => {
    render(<Overflow />);
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items).toHaveLength(5);
    expect(items[4]).toHaveTextContent('+8');
    expect(screen.getByText('and 8 more')).toHaveClass('sr-only');
  });

  it('honours a custom max', () => {
    render(<Overflow max={3} />);
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[2]).toHaveTextContent('+10');
  });
});
