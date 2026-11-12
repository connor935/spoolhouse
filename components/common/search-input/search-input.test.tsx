import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './search-input.stories';

const { Default, WithShortcut, Filled } = composeStories(stories);

describe('SearchInput', () => {
  it('reports every keystroke', async () => {
    const onChange = fn();
    render(<Default onChange={onChange} />);
    const box = screen.getByRole('searchbox', { name: 'Search materials' });
    await userEvent.type(box, 'pla');
    expect(onChange).toHaveBeenLastCalledWith('pla');
    expect(box).toHaveValue('pla');
  });

  it('shows the current value', () => {
    render(<Filled />);
    expect(screen.getByRole('searchbox')).toHaveValue('polymaker petg');
  });

  it('has no shortcut by default', async () => {
    render(<Default />);
    const box = screen.getByRole('searchbox');
    expect(box).not.toHaveAttribute('aria-keyshortcuts');
    await userEvent.keyboard('/');
    expect(box).not.toHaveFocus();
  });

  it('focuses on "/" when the shortcut is on', async () => {
    render(<WithShortcut />);
    const box = screen.getByRole('searchbox');
    expect(box).toHaveAttribute('aria-keyshortcuts', '/');
    await userEvent.keyboard('/');
    expect(box).toHaveFocus();
  });
});
