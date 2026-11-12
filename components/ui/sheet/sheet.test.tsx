import { composeStories } from '@storybook/react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './sheet.stories';

const { Bottom, BottomOpen, LeftDrawer } = composeStories(stories);

describe('Sheet', () => {
  it('opens a bottom sheet with handle, kicker and title, and closes on Escape', async () => {
    render(<Bottom />);
    const trigger = screen.getByRole('button', { name: 'Re-weigh' });
    await userEvent.click(trigger);

    const sheet = await screen.findByRole('dialog', {
      name: 'Re-weigh #04 Basic Cyan',
    });
    expect(sheet).toHaveAttribute('data-side', 'bottom');
    expect(sheet.querySelector('[data-slot=sheet-handle]')).toBeInTheDocument();
    expect(within(sheet).getByText('Borrowed from Mia Koch')).toBeVisible();

    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
    expect(trigger).toHaveFocus();
  });

  it('runs the footer action and closes', async () => {
    const onSave = fn();
    render(<BottomOpen onSave={onSave} />);
    const sheet = await screen.findByRole('dialog');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
  });

  it('opens the left drawer without a handle and closes via its close button', async () => {
    render(<LeftDrawer />);
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }));

    const drawer = await screen.findByRole('dialog', { name: 'Spoolhouse' });
    expect(drawer).toHaveAttribute('data-side', 'left');
    expect(drawer.querySelector('[data-slot=sheet-handle]')).toBeNull();
    expect(
      within(drawer).getByRole('navigation', { name: 'Navigation' })
    ).toBeInTheDocument();

    await userEvent.click(
      within(drawer).getByRole('button', { name: 'Close' })
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
  });
});
