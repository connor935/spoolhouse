import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './theme-switch.stories';

const { Default, Unmounted } = composeStories(stories);

describe('ThemeSwitch', () => {
  it('presses the current theme and reports a new choice', async () => {
    const onValueChange = fn();
    render(<Default onValueChange={onValueChange} />);
    expect(screen.getByRole('button', { name: 'System' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Dark' }));
    expect(onValueChange).toHaveBeenCalledWith('dark');
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('does not report pressing the active theme again', async () => {
    const onValueChange = fn();
    render(<Default onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'System' }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('presses nothing while the theme is unknown', () => {
    render(<Unmounted />);
    for (const name of ['Light', 'Dark', 'System']) {
      expect(screen.getByRole('button', { name })).toHaveAttribute(
        'aria-pressed',
        'false'
      );
    }
  });
});
