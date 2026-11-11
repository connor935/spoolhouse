import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as stories from './reset-password-form.stories';

const { Default, InvalidLink, Expired } = composeStories(stories);

describe('ResetPasswordForm', () => {
  it('counts towards the minimum and sets the new password', async () => {
    const user = userEvent.setup();
    render(<Default />);
    expect(screen.getByText('At least 12 characters.')).toBeVisible();
    await user.type(screen.getByLabelText('New password'), 'correct-horse!');
    expect(screen.getByText('14 / 12')).toBeVisible();
    await user.type(screen.getByLabelText('Repeat'), 'correct-horse!');
    await user.click(screen.getByRole('button', { name: 'Set new password' }));
    expect(Default.args.onSubmit).toHaveBeenCalledWith('correct-horse!');
  });

  it("refuses passwords that don't match", async () => {
    // The story's spy is shared across tests; start from zero calls.
    Default.args.onSubmit?.mockClear();
    const user = userEvent.setup();
    render(<Default />);
    await user.type(screen.getByLabelText('New password'), 'correct-horse!');
    await user.type(screen.getByLabelText('Repeat'), 'correct-horse?');
    await user.click(screen.getByRole('button', { name: 'Set new password' }));
    expect(screen.getByText("Passwords don't match.")).toBeVisible();
    expect(Default.args.onSubmit).not.toHaveBeenCalled();
  });

  it('asks for a new link when the token is missing', () => {
    render(<InvalidLink />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This reset link is invalid or incomplete.'
    );
    expect(screen.getByRole('link', { name: 'New link' })).toHaveAttribute(
      'href',
      '/forgot-password'
    );
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();
  });

  it('shows the server error', () => {
    render(<Expired />);
    expect(screen.getByRole('alert')).toHaveTextContent('may have expired');
  });
});
