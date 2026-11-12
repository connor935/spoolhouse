import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './request-submit-button.stories';

const { Request, Add, Pending, Inline } = composeStories(stories);

describe('RequestSubmitButton', () => {
  it.each([
    [false, false, 'material', 'Request material'],
    [true, false, 'material', 'Add material'],
    [false, true, undefined, 'Requesting…'],
    [true, true, undefined, 'Adding…'],
    [false, false, undefined, 'Request'],
  ])(
    'isAdmin=%s pending=%s noun=%s → "%s"',
    (isAdmin, pending, noun, label) => {
      render(<Request isAdmin={isAdmin} pending={pending} noun={noun} />);
      expect(screen.getByRole('button')).toHaveTextContent(label);
    }
  );

  it('submits the surrounding form by default', () => {
    render(<Add />);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('is disabled while pending', () => {
    render(<Pending />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('becomes a plain button with onClick', async () => {
    const onClick = fn();
    render(<Inline onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Request' });
    expect(button).toHaveAttribute('type', 'button');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
