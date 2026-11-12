import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './spool-tile.stories';

const {
  InUse,
  Lent,
  Full,
  Low,
  NeedsDrying,
  Empty,
  Requested,
  Borrowed,
  Selected,
  WithDetails,
  Static,
  AddTile,
  LongNames,
} = composeStories(stories);

function tile() {
  return document.querySelector('[data-slot="spool-tile"]') as HTMLElement;
}

describe('SpoolTile', () => {
  it('shows number, location, weight and meter', () => {
    render(<InUse />);
    expect(tile()).toHaveTextContent('#01');
    expect(screen.getByText('A2')).toBeInTheDocument();
    expect(tile()).toHaveTextContent('742 g');
    expect(
      screen.getByRole('meter', { name: 'Spool #01 filament left' })
    ).toHaveAttribute('aria-valuenow', '74');
    expect(
      document.querySelector('[data-slot="spool-status-tags"]')
    ).toBeNull();
  });

  it.each([
    ['lent', Lent, 'Lent · Jonas'],
    ['full', Full, 'Full'],
    ['low', Low, 'Low'],
    ['dry', NeedsDrying, 'Dry?'],
    ['empty', Empty, 'Empty'],
    ['requested', Requested, 'Req · Anna'],
    ['borrowed', Borrowed, 'Borrowed · Mia'],
  ])('renders the %s tag', (_, Story, text) => {
    render(<Story />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('is read-only while lent out, even with callbacks passed', () => {
    // The Lent story inherits onSelect/onEdit/onMarkDried from the meta.
    render(<Lent />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(tile()).toHaveAttribute('data-lent-out');
    expect(tile()).toHaveAttribute(
      'title',
      expect.stringContaining('editable again once returned')
    );
  });

  it('truncates long names and locations, keeping the full text as title', () => {
    render(<LongNames />);
    const name = 'Maximiliane Alexandra von Hohenzollern-Sigmaringen';
    for (const text of [
      `Req · ${name}`,
      `Lent · ${name}`,
      `Borrowed · ${name}`,
      'Dry box on the top shelf left',
    ]) {
      const label = screen.getByText(text);
      expect(label).toHaveClass('truncate');
      expect(label.closest('[data-slot="badge"]')).toHaveAttribute(
        'title',
        text
      );
    }
  });

  it('uses the low tone on the meter for low and empty spools', () => {
    render(<Low />);
    expect(screen.getByRole('meter')).toHaveAttribute('data-tone', 'low');
  });

  it('re-weighs when the tile is clicked', async () => {
    const onSelect = fn();
    render(<InUse onSelect={onSelect} />);
    const button = screen.getByRole('button', { name: 'Re-weigh spool #01' });
    expect(button).toHaveAccessibleDescription('742 g');
    await userEvent.click(button);
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('marks dried without re-weighing', async () => {
    const onSelect = fn();
    const onMarkDried = fn();
    render(<NeedsDrying onSelect={onSelect} onMarkDried={onMarkDried} />);
    await userEvent.click(screen.getByRole('button', { name: 'Dry?' }));
    expect(onMarkDried).toHaveBeenCalledOnce();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('edits without re-weighing', async () => {
    const onSelect = fn();
    const onEdit = fn();
    render(<InUse onSelect={onSelect} onEdit={onEdit} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Edit spool #01' })
    );
    expect(onEdit).toHaveBeenCalledOnce();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('flags the selected tile', () => {
    render(<Selected />);
    expect(tile()).toHaveAttribute('data-selected', 'true');
  });

  it('adds spool type, price and purchase date with details', () => {
    render(<WithDetails />);
    expect(tile()).toHaveTextContent('Prusament — Cardboard 1 kg (193 g)');
    expect(tile()).toHaveTextContent('€19.99 · bought 14 Mar 2026');
  });

  it('has no buttons without callbacks', () => {
    render(<Static />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('AddSpoolTile', () => {
  it('is a button labelled "Spool"', () => {
    render(<AddTile />);
    expect(screen.getByRole('button', { name: 'Spool' })).toBeInTheDocument();
  });
});
