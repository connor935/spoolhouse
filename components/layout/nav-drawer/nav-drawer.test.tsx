import { composeStories } from '@storybook/react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './nav-drawer.stories';

const { Admin, Member, Closed } = composeStories(stories);

describe('NavDrawer', () => {
  it('opens as a navigation dialog with the sidebar sections', async () => {
    render(<Closed />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Open navigation' })
    );
    const drawer = await screen.findByRole('dialog', { name: 'Navigation' });
    expect(drawer).toHaveAttribute('data-side', 'left');
    expect(
      within(drawer)
        .getAllByRole('navigation')
        .map((n) => n.getAttribute('aria-label'))
    ).toEqual(['Main', 'Catalog', 'Admin']);
  });

  it('hides the Admin section from members and marks the active group', async () => {
    render(<Member />);
    const drawer = await screen.findByRole('dialog', { name: 'Navigation' });
    expect(
      within(drawer).queryByRole('navigation', { name: 'Admin' })
    ).not.toBeInTheDocument();
    expect(
      within(drawer).getByRole('link', { name: /^Makerspace Kiel/ })
    ).toHaveAttribute('aria-current', 'page');
  });

  it('closes when a link is followed', async () => {
    const onOpenChange = fn();
    render(<Admin onOpenChange={onOpenChange} />);
    const drawer = await screen.findByRole('dialog', { name: 'Navigation' });
    const link = within(drawer).getByRole('link', { name: 'Statistics' });
    link.addEventListener('click', (e) => e.preventDefault());
    await userEvent.click(link);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
  });

  it('closes from its close button', async () => {
    render(<Admin />);
    const drawer = await screen.findByRole('dialog', { name: 'Navigation' });
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Close navigation' })
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
  });

  it('offers account, sign-out and the theme switch', async () => {
    const onSignOut = fn();
    const onThemeChange = fn();
    render(<Admin onSignOut={onSignOut} onThemeChange={onThemeChange} />);
    const drawer = await screen.findByRole('dialog', { name: 'Navigation' });
    expect(
      within(drawer).getByRole('link', { name: 'Account' })
    ).toHaveAttribute('href', '/account');
    expect(
      within(drawer).getByRole('button', { name: 'Dark' })
    ).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Light' })
    );
    expect(onThemeChange).toHaveBeenCalledWith('light');
    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Sign out' })
    );
    expect(onSignOut).toHaveBeenCalledOnce();
  });
});
