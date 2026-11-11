import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as stories from './group-stock-view.stories';

const { Default, Paged, Empty } = composeStories(stories);

const materialNames = () =>
  screen.queryAllByRole('heading', { level: 3 }).map((h) => h.textContent);

describe('GroupStockView', () => {
  it('groups the stock by material, sorted by name', () => {
    render(<Default />);
    expect(materialNames()).toEqual([
      'Basic Cyan',
      'Fire Engine Red',
      'Galaxy Black',
      'Prusa Orange',
    ]);
    const black = screen.getByRole('region', { name: 'Galaxy Black' });
    expect(within(black).getAllByRole('listitem')).toHaveLength(3);
  });

  it('wires Request / Cancel / Mark returned to the right spool', async () => {
    const user = userEvent.setup();
    render(<Default />);
    const black = screen.getByRole('region', { name: 'Galaxy Black' });
    await user.click(within(black).getByRole('button', { name: 'Request' }));
    expect(Default.args.onRequest).toHaveBeenCalledWith('spool-black-anna');
    await user.click(within(black).getByRole('button', { name: 'Cancel' }));
    expect(Default.args.onCancelRequest).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'spool-black-jonas' })
    );
    await user.click(screen.getByRole('button', { name: 'Mark returned' }));
    expect(Default.args.onMarkReturned).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'spool-orange-me-2' })
    );
  });

  it('search narrows the materials; hide lent drops lent spools', async () => {
    const user = userEvent.setup();
    render(<Default />);
    await user.type(
      screen.getByRole('searchbox', { name: /search shared spools/i }),
      'cyan'
    );
    expect(materialNames()).toEqual(['Basic Cyan']);
    await user.click(screen.getByRole('checkbox', { name: 'Hide lent' }));
    expect(materialNames()).toEqual([]);
    expect(screen.getByText(/no shared spools match/i)).toBeInTheDocument();
  });

  it('pages materials with Load more', async () => {
    const user = userEvent.setup();
    render(<Paged />);
    expect(materialNames()).toHaveLength(2);
    expect(screen.getByText('2 of 4 materials')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Load more' }));
    expect(materialNames()).toHaveLength(4);
    expect(
      screen.queryByRole('button', { name: 'Load more' })
    ).not.toBeInTheDocument();
  });

  it('shows members with share counts and my sharing summary', () => {
    render(<Default />);
    const members = screen.getByRole('region', { name: 'Members' });
    expect(within(members).getAllByRole('listitem')).toHaveLength(5);
    expect(within(members).getByText('Owner')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Change' })).toHaveAttribute(
      'href',
      '/groups/group-farm?view=settings'
    );
  });

  it('says when nobody shares anything', () => {
    render(<Empty />);
    expect(screen.getByText(/nobody shares spools/i)).toBeInTheDocument();
  });
});
