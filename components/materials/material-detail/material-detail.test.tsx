import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';

import * as stories from './material-detail.stories';

const { Member, Admin, AdminPending, OwnRejected } = composeStories(stories);

const region = (name: string) => screen.getByRole('region', { name });

describe('MaterialDetail', () => {
  it('heads the page with name, type, manufacturer and breadcrumb', () => {
    render(<Member />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Galaxy Black' })
    ).toBeVisible();
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(
      within(crumbs).getByRole('link', { name: 'Inventory' })
    ).toHaveAttribute('href', '/inventory');
    expect(screen.getByText('Prusament')).toBeVisible();
    expect(screen.getByText('#1F1F1F')).toBeVisible();
  });

  it('shows the key figures', () => {
    render(<Member />);
    const figures = region('Key figures');
    expect(figures).toHaveTextContent('Your stock2.16kg3 spools');
    expect(figures).toHaveTextContent('Used · 30 days340g');
    expect(figures).toHaveTextContent('Lasts about~6mo');
    expect(figures).toHaveTextContent(
      'Stock value€43.18Ø €19.99 / kg · 3/3 priced'
    );
  });

  it('gives members only Add spool, no review or edit', () => {
    render(<Member />);
    expect(screen.getByRole('button', { name: /Add spool/ })).toBeVisible();
    for (const name of ['Approve', 'Reject', 'Delete', 'Edit'])
      expect(screen.queryByRole('button', { name })).toBeNull();
  });

  it('opens re-weigh from a tile with the tile as anchor', async () => {
    const onSelectSpool = fn();
    render(<Member onSelectSpool={onSelectSpool} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Re-weigh spool #02' })
    );
    expect(onSelectSpool).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'spool-gb-2' }),
      2,
      expect.any(HTMLElement)
    );
  });

  it('adds a spool from the header and the dashed tile', async () => {
    const onAddSpool = fn();
    render(<Member onAddSpool={onAddSpool} />);
    await userEvent.click(screen.getByRole('button', { name: /Add spool/ }));
    await userEvent.click(
      within(region('Your spools')).getByRole('button', { name: 'Spool' })
    );
    expect(onAddSpool).toHaveBeenCalledTimes(2);
  });

  it('lets an admin edit but not delete a material in use', () => {
    render(<Admin />);
    expect(screen.getByRole('button', { name: 'Edit' })).toBeEnabled();
    const del = screen.getByRole('button', { name: 'Delete' });
    expect(del).toBeDisabled();
    expect(del).toHaveAccessibleDescription('In use by 3 spools');
    expect(screen.getByText('Imported · SpoolmanDB')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
  });

  it('gives an admin approve, reject and delete on an unused pending entry', async () => {
    const onApprove = fn();
    const onReject = fn();
    const onDelete = fn();
    render(
      <AdminPending
        onApprove={onApprove}
        onReject={onReject}
        onDelete={onDelete}
      />
    );
    expect(screen.getByText('Pending review')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onApprove).toHaveBeenCalledOnce();
    expect(onReject).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it('explains an empty group section', () => {
    render(<AdminPending />);
    expect(
      within(region('In your groups')).getByText(
        'Nobody in your groups shares this material'
      )
    ).toBeVisible();
  });

  it('lets the submitter edit their rejected entry', () => {
    render(<OwnRejected />);
    expect(screen.getByText('Rejected')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeVisible();
  });

  it('renders the datasheet and the group table', () => {
    render(<Member />);
    expect(within(region('Properties')).getByText('Density')).toBeVisible();
    expect(within(region('In your groups')).getAllByRole('row')).toHaveLength(
      4
    );
  });

  it('adds a spool with N', async () => {
    const onAddSpool = fn();
    render(<Member onAddSpool={onAddSpool} />);
    expect(screen.getByRole('button', { name: 'Add spool' })).toHaveAttribute(
      'aria-keyshortcuts',
      'N'
    );
    await userEvent.keyboard('n');
    expect(onAddSpool).toHaveBeenCalledOnce();
  });
});
