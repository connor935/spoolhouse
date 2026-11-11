import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './inventory-view.stories';

const { Default, Filtered, NoMatches, EmptyStatus, NewUser, Mobile } =
  composeStories(stories);

const blocks = () =>
  screen
    .getAllByRole('region')
    .filter((r) => r.getAttribute('data-slot') === 'material-block');

describe('InventoryView', () => {
  it('heads the page with in-stock totals and the status counts', () => {
    render(<Default />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Inventory' })
    ).toBeVisible();
    expect(screen.getByText(/^6 spools · .* · 3 materials$/)).toBeVisible();
    expect(
      screen.getByRole('button', { name: /In stock\s*6/ })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Empty\s*1/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /All\s*7/ })).toBeVisible();
  });

  it('shows in-stock spools per material, hiding empty ones', () => {
    render(<Default />);
    expect(
      blocks()
        .map((b) => b.getAttribute('aria-label'))
        .sort()
    ).toEqual([
      'Fire Engine Red PETG',
      'Galaxy Black PLA',
      'Prusa Orange PETG',
    ]);
  });

  it('changes the stock status and the search', async () => {
    const onQueryChange = fn();
    render(<Default onQueryChange={onQueryChange} />);
    await userEvent.click(screen.getByRole('button', { name: /Empty\s*1/ }));
    expect(onQueryChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'empty' })
    );
    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Search inventory' }),
      'x'
    );
    expect(onQueryChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: 'x' })
    );
  });

  it('applies filters and lists them as removable chips', async () => {
    const onQueryChange = fn();
    render(<Filtered onQueryChange={onQueryChange} />);
    expect(blocks()).toHaveLength(2);
    const chips = screen.getByRole('group', { name: 'Active filters' });
    await userEvent.click(
      within(chips).getByRole('button', { name: 'Remove filter PETG' })
    );
    expect(onQueryChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ filamentTypes: [] })
    );
  });

  it('opens the filter panel from the toolbar', async () => {
    render(<Default />);
    expect(screen.queryByRole('region', { name: 'Filters' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    expect(screen.getByRole('region', { name: 'Filters' })).toBeVisible();
  });

  it('offers to clear filters when nothing matches', async () => {
    const onQueryChange = fn();
    render(<NoMatches onQueryChange={onQueryChange} />);
    expect(screen.getByText('No spools match these filters.')).toBeVisible();
    await userEvent.click(
      screen.getByRole('button', { name: 'Clear filters' })
    );
    expect(onQueryChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: '', filamentTypes: [], status: 'in-stock' })
    );
  });

  it('says so when no spool is used up yet', () => {
    render(<EmptyStatus />);
    expect(screen.getByText('No empty spools yet.')).toBeVisible();
  });

  it('greets a new user with the onboarding steps', async () => {
    const onAddSpool = fn();
    render(<NewUser onAddSpool={onAddSpool} />);
    expect(screen.getByText('Your shelf is empty')).toBeVisible();
    await userEvent.click(
      screen.getByRole('button', { name: 'Add your first spool' })
    );
    expect(onAddSpool).toHaveBeenCalledWith(null);
  });

  it('wires tiles to re-weigh, edit and add, and names to the material', async () => {
    const onSelectSpool = fn();
    const onEditSpool = fn();
    const onAddSpool = fn();
    const onOpenMaterial = fn();
    render(
      <Default
        onSelectSpool={onSelectSpool}
        onEditSpool={onEditSpool}
        onAddSpool={onAddSpool}
        onOpenMaterial={onOpenMaterial}
      />
    );
    const galaxy = screen.getByRole('region', { name: 'Galaxy Black PLA' });
    await userEvent.click(
      within(galaxy).getByRole('button', { name: 'Re-weigh spool #01' })
    );
    expect(onSelectSpool).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'spool-gb-1' }),
      expect.objectContaining({ name: 'Galaxy Black' })
    );
    await userEvent.click(
      within(galaxy).getByRole('button', { name: 'Edit spool #02' })
    );
    expect(onEditSpool).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'spool-gb-2' }),
      expect.objectContaining({ name: 'Galaxy Black' })
    );
    await userEvent.click(
      within(galaxy).getByRole('button', { name: /Add a spool of/ })
    );
    expect(onAddSpool).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'Galaxy Black' })
    );
    await userEvent.click(
      within(galaxy).getByRole('button', { name: 'Open Galaxy Black PLA' })
    );
    expect(onOpenMaterial).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Galaxy Black' })
    );
    await userEvent.click(screen.getByRole('button', { name: /^Add spool/ }));
    expect(onAddSpool).toHaveBeenLastCalledWith(null);
  });

  it('uses collapsible cards and a filter sheet on mobile', async () => {
    render(<Mobile />);
    expect(blocks()[0]).toHaveAttribute('data-layout', 'card');
    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    expect(
      await screen.findByRole('dialog', { name: 'Filters' })
    ).toBeVisible();
  });
});
