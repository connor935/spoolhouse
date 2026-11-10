import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './button.stories';

const { Default, Disabled, IconOnly, AllVariants } = composeStories(stories);

describe('Button', () => {
  it('renders its label as an accessible button', () => {
    render(<Default />);
    expect(screen.getByRole('button', { name: 'Add spool' })).toBeVisible();
  });

  it('calls onClick when clicked', async () => {
    const onClick = fn();
    render(<Default onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add spool' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not fire onClick while disabled', async () => {
    const onClick = fn();
    render(<Disabled onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Add spool' });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('gives icon-only buttons an accessible name', () => {
    render(<IconOnly />);
    expect(
      screen.getByRole('button', { name: 'Delete spool' })
    ).toBeInTheDocument();
  });

  it('marks the rendered element with data-slot="button"', () => {
    render(<AllVariants />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(6);
    for (const button of buttons) {
      expect(button).toHaveAttribute('data-slot', 'button');
    }
  });
});
