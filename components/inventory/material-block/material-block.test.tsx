import { composeStories } from '@storybook/react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import { galaxyBlackPla } from '@/stories/fixtures/inventory';
import * as stories from './material-block.stories';

const { Shelf, HideEmpty, WithRequest, Card, CardCollapsed, InventoryRow } =
  composeStories(stories);

describe('MaterialBlock', () => {
  it('summarises the material in its header', () => {
    render(<Shelf />);
    const block = screen.getByRole('region', { name: 'Galaxy Black PLA' });
    const header = within(block).getByRole('button', {
      name: 'Open Galaxy Black PLA',
    });
    // Overlay button described by the visible header (WCAG 2.5.3).
    expect(header).toBeEmptyDOMElement();
    expect(header).toHaveAccessibleDescription(/Prusament/);
    expect(header).toHaveAccessibleDescription(/2\.16 kg/);
    expect(header).toHaveAccessibleDescription(/3 spools · ~6 weeks/);
  });

  it('renders a tile per spool, numbered oldest-first', () => {
    render(<Shelf />);
    for (const n of ['#01', '#03']) {
      expect(
        screen.getByRole('button', { name: `Re-weigh spool ${n}` })
      ).toBeInTheDocument();
    }
    // #02 is lent out: shown, but read-only (it's with the borrower).
    expect(screen.getByText('Lent · Jonas')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Re-weigh spool #02' })
    ).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit spool #02' })).toBeNull();
  });

  it('passes the clicked spool to onSelectSpool', async () => {
    const onSelectSpool = fn();
    render(<Shelf onSelectSpool={onSelectSpool} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Re-weigh spool #03' })
    );
    expect(onSelectSpool).toHaveBeenCalledWith(galaxyBlackPla.spools[2]);
  });

  it('opens the material and adds spools', async () => {
    const onOpenMaterial = fn();
    const onAddSpool = fn();
    render(<Shelf onOpenMaterial={onOpenMaterial} onAddSpool={onAddSpool} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Open Galaxy Black PLA' })
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Add a spool of Galaxy Black PLA' })
    );
    expect(onOpenMaterial).toHaveBeenCalledOnce();
    expect(onAddSpool).toHaveBeenCalledOnce();
  });

  it('hides filtered spools but keeps the spool count', () => {
    render(<HideEmpty />);
    expect(
      screen.queryByRole('button', { name: /Re-weigh spool/ })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Open Basic Cyan PLA' })
    ).toHaveAccessibleDescription(/1 spool/);
  });

  it('shows pending requests on the requested tile', () => {
    render(<WithRequest />);
    expect(screen.getByText('Req · Anna')).toBeInTheDocument();
  });

  describe('card layout', () => {
    it('collapses and expands its spool rows', async () => {
      render(<Card />);
      const trigger = screen.getByRole('button', { name: /^Galaxy Black/ });
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(
        screen.getByRole('button', { name: 'Re-weigh spool #01' })
      ).toBeInTheDocument();

      await userEvent.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await waitFor(() =>
        expect(
          screen.queryByRole('button', { name: 'Re-weigh spool #01' })
        ).not.toBeInTheDocument()
      );
    });

    it('starts collapsed when asked', () => {
      render(<CardCollapsed />);
      expect(
        screen.getByRole('button', { name: /^Galaxy Black/ })
      ).toHaveAttribute('aria-expanded', 'false');
    });

    it('names a row by its number and describes it by the visible row', () => {
      render(<Card />);
      const row = screen.getByRole('button', { name: 'Re-weigh spool #01' });
      // Overlay button: the visible text is the description, not hidden by
      // the label (WCAG 2.5.3).
      expect(row).toBeEmptyDOMElement();
      expect(row).toHaveAccessibleDescription(/#01/);
    });

    it('links to the material page below the rows', async () => {
      const onOpenMaterial = fn();
      render(<Card onOpenMaterial={onOpenMaterial} />);
      await userEvent.click(
        screen.getByRole('button', {
          name: 'Material details: Galaxy Black PLA',
        })
      );
      expect(onOpenMaterial).toHaveBeenCalledOnce();
    });

    it('has no material link without onOpenMaterial', () => {
      render(<Card onOpenMaterial={undefined} />);
      expect(
        screen.queryByRole('button', { name: /Material details/ })
      ).not.toBeInTheDocument();
    });

    it('re-weighs from a row', async () => {
      const onSelectSpool = fn();
      render(<Card onSelectSpool={onSelectSpool} />);
      await userEvent.click(
        screen.getByRole('button', { name: 'Re-weigh spool #03' })
      );
      expect(onSelectSpool).toHaveBeenCalledWith(galaxyBlackPla.spools[2]);
    });
  });

  it('opens the re-weigh popover for the clicked tile (composed row)', async () => {
    render(<InventoryRow />);
    const block = screen.getByRole('region', { name: 'Galaxy Black PLA' });
    await userEvent.click(
      within(block).getByRole('button', { name: 'Re-weigh spool #03' })
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Re-weigh #03 Galaxy Black',
    });
    expect(dialog).toHaveTextContent('Last: 1.19 kg total · 2 weeks ago');
    expect(block.querySelector('[data-selected="true"]')).toHaveTextContent(
      '#03'
    );

    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
  });
});
