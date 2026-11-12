import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import { spools } from '@/stories/fixtures/inventory';
import { reweighPreview } from './reweigh-form';
import * as stories from './reweigh-form.stories';

const { Default, Typed, BelowEmpty, Borrowed, Pending } =
  composeStories(stories);

const input = () =>
  screen.getByRole('textbox', { name: 'Measured total weight (g)' });
const left = () => screen.getByTestId('reweigh-left');

describe('reweighPreview', () => {
  // spools.full: 193 g empty spool, 1000 g of filament, 1193 g total.
  it('subtracts the empty spool and diffs against the current amount', () => {
    expect(reweighPreview(spools.full, 1112)).toEqual({
      leftGrams: 919,
      deltaGrams: -81,
      percentLeft: 91.9,
      isLow: false,
    });
  });

  it('clamps filament left at 0 below the empty spool weight', () => {
    const preview = reweighPreview(spools.full, 150);
    expect(preview.leftGrams).toBe(0);
    expect(preview.deltaGrams).toBe(-1000);
    expect(preview.percentLeft).toBe(0);
    expect(preview.isLow).toBe(true);
  });

  it('caps the percentage at 100 and reports increases', () => {
    const preview = reweighPreview(spools.full, 1300);
    expect(preview.leftGrams).toBe(1107);
    expect(preview.deltaGrams).toBe(107);
    expect(preview.percentLeft).toBe(100);
  });

  it('flags low at 15 % or less', () => {
    expect(reweighPreview(spools.full, 193 + 150).isLow).toBe(true);
    expect(reweighPreview(spools.full, 193 + 151).isLow).toBe(false);
  });
});

describe('ReweighForm', () => {
  it('starts from the current weight with the last weighing', () => {
    render(<Default />);
    expect(input()).toHaveValue('1193');
    expect(input()).toHaveAccessibleDescription(
      'Last: 1.19 kg total · 2 weeks ago'
    );
    expect(left()).toHaveTextContent('1.00 kg');
    expect(screen.getByRole('status')).toHaveTextContent(
      'No change since last'
    );
  });

  it('previews the new amount and the drop as you type', async () => {
    render(<Default />);
    await userEvent.clear(input());
    await userEvent.type(input(), '1112');
    expect(left()).toHaveTextContent('919 g');
    expect(screen.getByRole('status')).toHaveTextContent('−81 g since last');
    expect(
      screen.getByRole('meter', { name: 'Filament left after re-weigh' })
    ).toHaveAttribute('aria-valuenow', '92');
  });

  it('shows 0 g, not a negative amount, below the empty spool', () => {
    render(<BelowEmpty />);
    expect(left()).toHaveTextContent('0 g');
    expect(screen.getByRole('status')).toHaveTextContent('−1.00 kg since last');
  });

  it('saves the typed total on Enter', async () => {
    const onSave = fn();
    render(<Typed onSave={onSave} />);
    await userEvent.type(input(), '{Enter}');
    expect(onSave).toHaveBeenCalledWith(1112);
  });

  it('saves from the button and rounds decimals like the server', async () => {
    const onSave = fn();
    render(<Default onSave={onSave} />);
    await userEvent.clear(input());
    await userEvent.type(input(), '1112,6');
    await userEvent.click(screen.getByRole('button', { name: /Save/ }));
    expect(onSave).toHaveBeenCalledWith(1113);
  });

  it('refuses input that is not a weight', async () => {
    const onSave = fn();
    render(<Default onSave={onSave} />);
    await userEvent.clear(input());
    await userEvent.type(input(), 'abc{Enter}');
    expect(onSave).not.toHaveBeenCalled();
    expect(input()).toBeInvalid();
    expect(input()).toHaveAccessibleDescription(
      expect.stringContaining('Enter the weight in whole grams.')
    );
    expect(screen.getByRole('button', { name: /Save/ })).toBeDisabled();
  });

  it('notes that a borrower’s drop counts toward the borrow', () => {
    render(<Borrowed />);
    expect(screen.getByRole('status')).toHaveTextContent(
      '−58 g · counts toward this borrow'
    );
  });

  it('does not save twice while pending', async () => {
    const onSave = fn();
    render(<Pending onSave={onSave} />);
    await userEvent.type(input(), '{Enter}');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('links to the full edit dialog', async () => {
    const onEditDetails = fn();
    render(<Default onEditDetails={onEditDetails} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Edit all details' })
    );
    expect(onEditDetails).toHaveBeenCalledOnce();
  });

  it('saves with a graphite primary button, not the orange accent', () => {
    render(<Typed />);
    const save = screen.getByRole('button', { name: /Save/ });
    expect(save).toHaveClass('bg-primary');
    expect(save).not.toHaveClass('bg-accent');
  });
});
