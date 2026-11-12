import { composeStories } from '@storybook/react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './user-menu.stories';

const { Default, Open, Active, Collapsed } = composeStories(stories);

describe('UserMenu', () => {
  it('shows name and role on the trigger', () => {
    const { unmount } = render(<Default />);
    expect(screen.getByRole('button', { name: /Felix/ })).toHaveTextContent(
      'Admin'
    );
    unmount();
    render(<Active />);
    expect(screen.getByRole('button', { name: /Felix/ })).toHaveTextContent(
      'Member'
    );
  });

  it('opens with account link, theme switch and sign-out; Escape closes', async () => {
    render(<Default />);
    const trigger = screen.getByRole('button', { name: /Felix/ });
    await userEvent.click(trigger);
    const menu = await screen.findByRole('dialog', { name: 'User menu' });
    expect(within(menu).getByRole('link', { name: 'Account' })).toHaveAttribute(
      'href',
      '/account'
    );
    expect(within(menu).getByRole('group', { name: 'Theme' })).toBeVisible();
    expect(
      within(menu).getByRole('button', { name: 'System' })
    ).toHaveAttribute('aria-pressed', 'true');
    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    expect(trigger).toHaveFocus();
  });

  it('switches theme and signs out', async () => {
    const onThemeChange = fn();
    const onSignOut = fn();
    render(<Open onThemeChange={onThemeChange} onSignOut={onSignOut} />);
    const menu = await screen.findByRole('dialog', { name: 'User menu' });
    await userEvent.click(within(menu).getByRole('button', { name: 'Light' }));
    expect(onThemeChange).toHaveBeenCalledWith('light');
    await userEvent.click(
      within(menu).getByRole('button', { name: 'Sign out' })
    );
    expect(onSignOut).toHaveBeenCalledOnce();
  });

  it('uses an icon trigger with an accessible name when collapsed', async () => {
    render(<Collapsed />);
    const trigger = screen.getByRole('button', { name: 'User menu' });
    expect(trigger).not.toHaveTextContent('Felix');
    await userEvent.click(trigger);
    expect(
      await screen.findByRole('dialog', { name: 'User menu' })
    ).toHaveTextContent('Felix');
  });
});
