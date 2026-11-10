import { composeStories } from '@storybook/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './dropdown-menu.stories';

const { SpoolActions, UserMenu } = composeStories(stories);

describe('DropdownMenu', () => {
  it('opens a menu from its trigger', async () => {
    render(<SpoolActions />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Actions' }));
    expect(await screen.findByRole('menu')).toBeVisible();
    expect(screen.getAllByRole('menuitem')).toHaveLength(4);
  });

  it('fires the item callback and closes on select', async () => {
    const onAction = fn();
    render(<SpoolActions onAction={onAction} />);
    await userEvent.click(screen.getByRole('button', { name: 'Actions' }));
    await userEvent.click(
      await screen.findByRole('menuitem', { name: /Delete spool/ })
    );
    expect(onAction).toHaveBeenCalledExactlyOnceWith('delete');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('is keyboard operable; disabled items take focus but do nothing', async () => {
    const onAction = fn();
    render(<SpoolActions onAction={onAction} />);
    screen.getByRole('button', { name: 'Actions' }).focus();
    await userEvent.keyboard('{Enter}');
    await screen.findByRole('menu');
    // Opening from the keyboard highlights the first item (asynchronously).
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: /Re-weigh/ })).toHaveFocus()
    );
    // Re-weigh → Edit → Lend (disabled, still focusable per WAI-ARIA) → Delete
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: /Edit/ })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    const lend = screen.getByRole('menuitem', { name: /Lend/ });
    expect(lend).toHaveFocus();
    expect(lend).toHaveAttribute('aria-disabled', 'true');
    await userEvent.keyboard('{Enter}');
    expect(onAction).not.toHaveBeenCalled();
    await userEvent.keyboard('{ArrowDown}');
    expect(
      screen.getByRole('menuitem', { name: /Delete spool/ })
    ).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onAction).toHaveBeenCalledExactlyOnceWith('delete');
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    render(<SpoolActions />);
    const trigger = screen.getByRole('button', { name: 'Actions' });
    await userEvent.click(trigger);
    await screen.findByRole('menu');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('checks the selected radio item', async () => {
    render(<UserMenu />);
    await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    expect(
      await screen.findByRole('menuitemradio', { name: /System/ })
    ).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('menuitemradio', { name: /Dark/ }));
    expect(screen.getByRole('menuitemradio', { name: /Dark/ })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });
});
