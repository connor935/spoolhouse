import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './app-sidebar.stories';

const { Admin, Member, GroupActive, Collapsed } = composeStories(stories);

const badgeOf = (link: HTMLElement) =>
  link.querySelector('[data-slot=nav-badge]');

describe('AppSidebar', () => {
  it('marks only the active item with aria-current="page"', () => {
    render(<Admin />);
    const current = screen
      .getAllByRole('link')
      .filter((l) => l.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAccessibleName('Overview');
  });

  it('marks a group sub-item active on its group page', () => {
    render(<GroupActive />);
    expect(
      screen.getByRole('link', { name: /^Print Farm Friends/ })
    ).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Groups' })).not.toHaveAttribute(
      'aria-current'
    );
  });

  it('renders accent pills for waiting work and muted counts for totals', () => {
    render(<Admin />);
    const borrows = screen.getByRole('link', {
      name: /^Borrows\s*, 1 open request$/,
    });
    expect(badgeOf(borrows)).toHaveAttribute('data-tone', 'pill');
    const inventory = screen.getByRole('link', {
      name: /^Inventory\s*, 14 spools in stock$/,
    });
    expect(badgeOf(inventory)).toHaveAttribute('data-tone', 'count');
    expect(badgeOf(inventory)).toHaveTextContent('14');
    expect(
      screen.getByRole('link', { name: /^Review materials\s*, 7 pending$/ })
    ).toBeInTheDocument();
    // Plain items carry no badge.
    expect(
      badgeOf(screen.getByRole('link', { name: 'Statistics' }))
    ).toBeNull();
  });

  it('shows the Admin section to admins only', () => {
    const { unmount } = render(<Admin />);
    const admin = screen.getByRole('navigation', { name: 'Admin' });
    expect(within(admin).getByRole('link', { name: 'Users' })).toHaveAttribute(
      'href',
      '/admin/users'
    );
    unmount();
    render(<Member />);
    expect(
      screen.queryByRole('navigation', { name: 'Admin' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Catalog' })
    ).toBeInTheDocument();
  });

  it('lists the groups under Groups and can fold them away', async () => {
    render(<Admin />);
    expect(
      screen.getByRole('link', { name: /^Makerspace Kiel\s*, 61 shared/ })
    ).toHaveAttribute('href', '/groups/group-kiel');
    await userEvent.click(screen.getByRole('button', { name: 'Hide groups' }));
    expect(
      screen.queryByRole('link', { name: /Makerspace Kiel/ })
    ).not.toBeInTheDocument();
  });

  it('collapses to the rail and expands again', async () => {
    const onCollapsedChange = fn();
    render(<Admin onCollapsedChange={onCollapsedChange} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Collapse sidebar' })
    );
    expect(onCollapsedChange).toHaveBeenLastCalledWith(true);
    await userEvent.click(
      screen.getByRole('button', { name: 'Expand sidebar' })
    );
    expect(onCollapsedChange).toHaveBeenLastCalledWith(false);
    expect(
      screen.getByRole('button', { name: 'Collapse sidebar' })
    ).toBeInTheDocument();
  });

  it('labels rail icons with tooltips and corner pills when collapsed', async () => {
    render(<Collapsed />);
    expect(screen.queryByText('Statistics')).not.toBeInTheDocument();
    const borrows = screen.getByRole('link', {
      name: 'Borrows, 1 open request',
    });
    expect(borrows).toHaveAttribute('aria-current', 'page');
    expect(borrows.querySelector('[data-slot=rail-dot]')).toHaveTextContent(
      '1'
    );
    await userEvent.hover(screen.getByRole('link', { name: 'Statistics' }));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Statistics');
  });

  it('opens the user menu with account, theme and sign-out', async () => {
    const onSignOut = fn();
    const onThemeChange = fn();
    render(<Admin onSignOut={onSignOut} onThemeChange={onThemeChange} />);
    await userEvent.click(screen.getByRole('button', { name: /Felix/ }));
    const menu = await screen.findByRole('dialog', { name: 'User menu' });
    expect(within(menu).getByRole('link', { name: 'Account' })).toHaveAttribute(
      'href',
      '/account'
    );
    await userEvent.click(within(menu).getByRole('button', { name: 'Dark' }));
    expect(onThemeChange).toHaveBeenCalledWith('dark');
    await userEvent.click(
      within(menu).getByRole('button', { name: 'Sign out' })
    );
    expect(onSignOut).toHaveBeenCalledOnce();
  });
});
