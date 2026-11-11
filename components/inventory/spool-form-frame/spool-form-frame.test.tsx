import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './spool-form-frame.stories';

const { Add, WithError, Edit, Saving, MobileSheet } = composeStories(stories);

describe('SpoolFormFrame', () => {
  it('titles the add form and submits it', async () => {
    const onSubmit = fn();
    render(<Add onSubmit={onSubmit} />);
    const dialog = await screen.findByRole('dialog', { name: 'Add new spool' });
    expect(dialog).toHaveTextContent('02 — Inventory / New spool');
    expect(dialog).toHaveTextContent(/Register a physical spool/);
    expect(screen.queryByRole('button', { name: /Delete spool/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Add spool/ }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('shows a validation error in the footer', async () => {
    render(<WithError />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Pick a spool type (or request a new one)'
    );
  });

  it('offers delete when editing', async () => {
    const onDelete = fn();
    render(<Edit onDelete={onDelete} />);
    await screen.findByRole('dialog', { name: 'Edit spool' });
    expect(screen.getByRole('button', { name: /Save changes/ })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: /Delete spool/ }));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('disables submit while saving', async () => {
    render(<Saving />);
    expect(
      await screen.findByRole('button', { name: /Saving/ })
    ).toBeDisabled();
  });

  it('renders as a bottom sheet on mobile', async () => {
    render(<MobileSheet />);
    const sheet = await screen.findByRole('dialog', { name: 'Add new spool' });
    expect(sheet).toHaveAttribute('data-side', 'bottom');
  });
});
