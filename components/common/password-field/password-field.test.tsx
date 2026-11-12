import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as stories from './password-field.stories';

const { Default, LongEnough, Mismatch, Temporary } = composeStories(stories);

const counter = (container: HTMLElement) =>
  container.querySelector('[data-slot=password-counter]');

describe('PasswordField', () => {
  it('counts typed characters against the minimum', async () => {
    const user = userEvent.setup();
    const { container } = render(<Default />);
    const input = screen.getByLabelText('New password');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('minlength', '12');
    expect(counter(container)).toHaveTextContent('0 / 12');

    await user.type(input, 'abc');
    expect(counter(container)).toHaveTextContent('3 / 12');
    expect(Default.args.onChange).toHaveBeenLastCalledWith('abc');
    expect(counter(container)).not.toHaveClass('text-accent');
  });

  it('marks the counter once the password is long enough', () => {
    const { container } = render(<LongEnough />);
    expect(counter(container)).toHaveTextContent('14 / 12');
    expect(counter(container)).toHaveClass('text-accent');
  });

  it('shows the error and marks the input invalid', () => {
    const { container } = render(<Mismatch />);
    expect(screen.getByText("Passwords don't match.")).toBeInTheDocument();
    expect(screen.getByLabelText('Repeat')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(counter(container)).toBeNull();
  });

  it('shows a temporary password in clear text with its help', () => {
    render(<Temporary />);
    expect(screen.getByLabelText('Temporary password')).toHaveAttribute(
      'type',
      'text'
    );
    expect(screen.getByText(/They can change it/)).toBeInTheDocument();
  });
});
