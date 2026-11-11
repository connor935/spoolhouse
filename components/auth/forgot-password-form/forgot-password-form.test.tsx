import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as stories from './forgot-password-form.stories';

const { Default, Sent } = composeStories(stories);

describe('ForgotPasswordForm', () => {
  it('requests a reset link for the email', async () => {
    const user = userEvent.setup();
    render(<Default />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Email'), ' ada@example.org ');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));
    expect(Default.args.onSubmit).toHaveBeenCalledWith('ada@example.org');
  });

  it('confirms without saying whether the account exists', () => {
    render(<Sent />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'If an account exists for this address, a reset link is on its way.'
    );
    expect(
      screen.getByRole('link', { name: /Back to sign in/ })
    ).toHaveAttribute('href', '/login');
  });
});
