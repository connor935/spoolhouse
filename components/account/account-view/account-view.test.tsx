import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as stories from './account-view.stories';

const { Default, TokenCreated, Copied, Member } = composeStories(stories);

const section = (name: RegExp) =>
  screen.getByRole('region', { name }) as HTMLElement;

describe('AccountView', () => {
  it('names the role and the join month in the header', () => {
    render(<Default />);
    expect(screen.getByText('Admin · member since Jan 2026')).toBeVisible();
    render(<Member />);
    expect(screen.getByText('Member · member since Jan 2026')).toBeVisible();
  });

  it('saves a changed display name, trimmed', async () => {
    const user = userEvent.setup();
    render(<Default />);
    const save = screen.getByRole('button', { name: 'Save name' });
    expect(save).toBeDisabled();

    const input = screen.getByRole('textbox', { name: 'Display name' });
    await user.clear(input);
    await user.type(input, '  Felix K ');
    await user.click(save);
    expect(Default.args.onSaveName).toHaveBeenCalledWith('Felix K');
  });

  it('refuses mismatched new passwords without calling the action', async () => {
    // The story's spy is shared across tests; start from zero calls.
    Default.args.onChangePassword?.mockClear();
    const user = userEvent.setup();
    render(<Default />);
    const pw = section(/change password/i);
    await user.type(within(pw).getByLabelText('Current password'), 'old');
    await user.type(
      within(pw).getByLabelText('New password'),
      'a-long-new-one'
    );
    await user.type(
      within(pw).getByLabelText('Repeat new password'),
      'a-long-new-two'
    );
    await user.click(
      within(pw).getByRole('button', { name: 'Change password' })
    );

    expect(within(pw).getByText("Passwords don't match.")).toBeVisible();
    expect(Default.args.onChangePassword).not.toHaveBeenCalled();
  });

  it('changes the password and clears the form on success', async () => {
    const user = userEvent.setup();
    render(<Default />);
    const pw = section(/change password/i);
    await user.type(within(pw).getByLabelText('Current password'), 'old');
    await user.type(
      within(pw).getByLabelText('New password'),
      'a-long-new-one'
    );
    await user.type(
      within(pw).getByLabelText('Repeat new password'),
      'a-long-new-one'
    );
    expect(within(pw).getAllByText('14 / 12')).toHaveLength(2);
    await user.click(
      within(pw).getByRole('button', { name: 'Change password' })
    );

    expect(Default.args.onChangePassword).toHaveBeenCalledWith({
      currentPassword: 'old',
      newPassword: 'a-long-new-one',
    });
    expect(within(pw).getByLabelText('New password')).toHaveValue('');
  });

  it('creates a token by name', async () => {
    const user = userEvent.setup();
    render(<Default />);
    const tokens = section(/api tokens/i);
    await user.type(within(tokens).getByLabelText('Token name'), 'Printer');
    await user.click(
      within(tokens).getByRole('button', { name: 'Create token' })
    );
    expect(Default.args.onCreateToken).toHaveBeenCalledWith('Printer');
    expect(within(tokens).getByLabelText('Token name')).toHaveValue('');
  });

  it('lists tokens with created date and last use, revoke per row', async () => {
    const user = userEvent.setup();
    render(<Default />);
    const rows = within(section(/api tokens/i)).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Scale script10 Nov 2026never');
    expect(rows[2]).toHaveTextContent('12 min ago');
    expect(rows[3]).toHaveTextContent('3 mo ago');

    await user.click(
      screen.getByRole('button', { name: 'Revoke Home Assistant' })
    );
    expect(Default.args.onRevokeToken).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'tok-2' })
    );
  });

  it('reveals a new token once with a copy button', async () => {
    const user = userEvent.setup();
    render(<TokenCreated />);
    const reveal = screen.getByRole('status');
    expect(reveal).toHaveTextContent('sph_7Kd9qXw2mT4nV8bR1pLz6cYe3uHs0aJf');
    expect(reveal).toHaveTextContent("won't be shown again");
    await user.click(within(reveal).getByRole('button', { name: 'Copy' }));
    expect(TokenCreated.args.onCopyToken).toHaveBeenCalled();
  });

  it('confirms the copy on the button', () => {
    render(<Copied />);
    expect(screen.getByRole('button', { name: 'Copied' })).toBeVisible();
  });

  it('links to the API docs', () => {
    render(<Member />);
    expect(screen.getByRole('link', { name: /api docs/i })).toHaveAttribute(
      'href',
      '/api-docs'
    );
    expect(screen.getByText('No tokens yet.')).toBeVisible();
  });
});
