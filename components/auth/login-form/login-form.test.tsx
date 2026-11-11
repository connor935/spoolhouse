import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as stories from './login-form.stories';

const { Default, SignupOpen, Failed, Pending } = composeStories(stories);

describe('LoginForm', () => {
  it('submits the credentials', async () => {
    const user = userEvent.setup();
    render(<Default />);
    await user.type(screen.getByLabelText('Email'), 'ada@example.org');
    await user.type(screen.getByLabelText('Password'), 'secret-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(Default.args.onSubmit).toHaveBeenCalledWith({
      email: 'ada@example.org',
      password: 'secret-password',
    });
  });

  it('links to the password reset', () => {
    render(<Default />);
    expect(
      screen.getByRole('link', { name: 'Forgot password?' })
    ).toHaveAttribute('href', '/forgot-password');
  });

  it('offers sign-up only while registration is open', () => {
    const { unmount } = render(<Default />);
    expect(
      screen.queryByRole('link', { name: 'Sign up' })
    ).not.toBeInTheDocument();
    unmount();
    render(<SignupOpen />);
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute(
      'href',
      '/signup'
    );
  });

  it('shows the error from the server', () => {
    render(<Failed />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Invalid email or password'
    );
  });

  it('disables the button while signing in', () => {
    render(<Pending />);
    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled();
  });
});
