import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as stories from './signup-form.stories';

const { Default, Failed } = composeStories(stories);

async function fill(password: string, repeat: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Name'), ' Lena Schulz ');
  await user.type(screen.getByLabelText('Email'), 'lena@example.org');
  await user.type(screen.getByLabelText('Password'), password);
  await user.type(screen.getByLabelText('Repeat'), repeat);
  await user.click(screen.getByRole('button', { name: 'Create account' }));
}

describe('SignupForm', () => {
  it('creates the account with trimmed name and email', async () => {
    render(<Default />);
    await fill('a-long-password', 'a-long-password');
    expect(Default.args.onSubmit).toHaveBeenCalledWith({
      name: 'Lena Schulz',
      email: 'lena@example.org',
      password: 'a-long-password',
    });
  });

  it("refuses passwords that don't match", async () => {
    // The story's spy is shared across tests; start from zero calls.
    Default.args.onSubmit?.mockClear();
    render(<Default />);
    await fill('a-long-password', 'a-long-passwort');
    expect(screen.getByText("Passwords don't match.")).toBeVisible();
    expect(Default.args.onSubmit).not.toHaveBeenCalled();
  });

  it('enforces the minimum length on the password', () => {
    render(<Default />);
    expect(screen.getByLabelText('Password')).toHaveAttribute(
      'minlength',
      '12'
    );
  });

  it('links back to sign in and shows server errors', () => {
    render(<Failed />);
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/login'
    );
    expect(screen.getByRole('alert')).toHaveTextContent('User already exists');
  });
});
