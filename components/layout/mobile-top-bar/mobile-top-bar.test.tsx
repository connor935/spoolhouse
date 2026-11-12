import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './mobile-top-bar.stories';

const { Default, NothingUnread } = composeStories(stories);

describe('MobileTopBar', () => {
  it('opens the navigation drawer', async () => {
    const onOpenNav = fn();
    render(<Default onOpenNav={onOpenNav} />);
    const toggle = screen.getByRole('button', { name: 'Open navigation' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(toggle);
    expect(onOpenNav).toHaveBeenCalledOnce();
  });

  it('links the bell to notifications with the unread count in its name', () => {
    const { container } = render(<Default />);
    expect(
      screen.getByRole('link', { name: 'Notifications, 4 unread' })
    ).toHaveAttribute('href', '/notifications');
    expect(
      container.querySelector('[data-slot=unread-dot]')
    ).toBeInTheDocument();
  });

  it('drops the dot when nothing is unread', () => {
    const { container } = render(<NothingUnread />);
    expect(
      screen.getByRole('link', { name: 'Notifications' })
    ).toBeInTheDocument();
    expect(container.querySelector('[data-slot=unread-dot]')).toBeNull();
  });

  it('links the logo home', () => {
    render(<Default />);
    expect(
      screen.getByRole('link', { name: 'Spoolhouse — overview' })
    ).toHaveAttribute('href', '/');
  });
});
