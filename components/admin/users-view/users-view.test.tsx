import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as stories from './users-view.stories';

const { Default, SavingTrusted, SignupOpen } = composeStories(stories);

const row = (name: string) =>
  screen.getByRole('row', { name: new RegExp(name) }) as HTMLElement;

describe('UsersView', () => {
  it('sums up accounts, admins and trusted contributors', () => {
    render(<Default />);
    expect(
      screen.getByText('6 accounts · 1 admin · 2 trusted')
    ).toBeInTheDocument();
    expect(screen.getByText(/Registration is closed/)).toBeVisible();
  });

  it('mentions open registration when sign-up is allowed', () => {
    render(<SignupOpen />);
    expect(screen.getByText(/Registration is open/)).toBeVisible();
  });

  it('marks the viewer and shows admin trust as implied', () => {
    render(<Default />);
    const me = row('Felix');
    expect(within(me).getByText('you')).toBeVisible();
    expect(within(me).getByText('implied')).toBeVisible();
    expect(within(me).queryByRole('switch')).not.toBeInTheDocument();
    expect(me).toHaveTextContent('19');
  });

  it('toggles a member trusted contributor', async () => {
    const user = userEvent.setup();
    render(<Default />);
    const anna = screen.getByRole('switch', {
      name: 'Trusted contributor: Anna Weber',
    });
    expect(anna).toBeChecked();
    await user.click(anna);
    expect(Default.args.onTrustedChange).toHaveBeenCalledWith('u-anna', false);

    await user.click(
      screen.getByRole('switch', { name: 'Trusted contributor: Mia Koch' })
    );
    expect(Default.args.onTrustedChange).toHaveBeenCalledWith('u-mia', true);
  });

  it('locks the switch that is being saved', () => {
    render(<SavingTrusted />);
    expect(
      screen.getByRole('switch', { name: 'Trusted contributor: Mia Koch' })
    ).toHaveAttribute('aria-disabled', 'true');
  });

  it('creates a user and clears the form', async () => {
    const user = userEvent.setup();
    render(<Default />);
    const form = screen.getByRole('region', { name: 'Create user' });
    await user.type(within(form).getByLabelText('Name'), ' Nina Neu ');
    await user.type(within(form).getByLabelText('Email'), 'nina@example.org');
    await user.type(
      within(form).getByLabelText('Temporary password'),
      'temporary-pass-1'
    );
    await user.click(within(form).getByRole('checkbox'));
    await user.click(within(form).getByRole('button', { name: 'Create user' }));

    expect(Default.args.onCreateUser).toHaveBeenCalledWith({
      name: 'Nina Neu',
      email: 'nina@example.org',
      password: 'temporary-pass-1',
      admin: true,
    });
    expect(within(form).getByLabelText('Name')).toHaveValue('');
  });
});
