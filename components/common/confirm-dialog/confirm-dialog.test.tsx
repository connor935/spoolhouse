import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './confirm-dialog.stories';

const { Default, Destructive, TitleOnly } = composeStories(stories);

describe('ConfirmDialog', () => {
  it('shows the question with default labels', () => {
    render(<Default />);
    const dialog = screen.getByRole('dialog', {
      name: 'Leave “Makerspace Nord”?',
    });
    expect(dialog).toHaveAccessibleDescription(
      'Your shared spools disappear from the group stock.'
    );
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
  });

  it('uses custom labels for a destructive action', () => {
    render(<Destructive />);
    expect(screen.getByRole('button', { name: 'Delete spool' })).toHaveClass(
      'bg-destructive'
    );
    expect(screen.getByRole('button', { name: 'Keep' })).toBeInTheDocument();
  });

  it('omits the description when none is given', () => {
    render(<TitleOnly />);
    expect(
      screen.getByRole('dialog', { name: 'Mark as returned?' })
    ).not.toHaveAccessibleDescription();
  });

  it('reports confirm and cancel', async () => {
    const onConfirm = fn();
    const onCancel = fn();
    render(<Default onConfirm={onConfirm} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('treats Escape as cancel', async () => {
    const onCancel = fn();
    render(<Default onCancel={onCancel} />);
    await userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('renders nothing while closed', () => {
    render(<Default open={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
