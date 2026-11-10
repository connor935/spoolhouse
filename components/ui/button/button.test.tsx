import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './button.stories';

const { Default, Disabled, IconOnly, WithShortcut, AllVariants } =
  composeStories(stories);

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

  it('keeps a shortcut hint out of the accessible name', () => {
    render(<WithShortcut />);
    const button = screen.getByRole('button', { name: 'Add spool' });
    expect(button).toHaveAttribute('aria-keyshortcuts', 'N');
    expect(button.querySelector('kbd')).toHaveTextContent('N');
  });

  it('renders every variant with its own classes and data-slot="button"', () => {
    render(<AllVariants />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(8);
    for (const button of buttons) {
      expect(button).toHaveAttribute('data-slot', 'button');
    }
    const classNames = buttons.map((button) => button.className);
    expect(new Set(classNames).size).toBe(classNames.length);
  });

  it('strips the box size from link buttons', () => {
    render(<Default variant="link" />);
    const button = screen.getByRole('button', { name: 'Add spool' });
    expect(button).toHaveClass('h-auto', 'p-0');
    expect(button).not.toHaveClass('h-9');
  });
});
