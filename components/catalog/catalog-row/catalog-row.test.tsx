import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import { CatalogRowActions } from './catalog-row';
import * as stories from './catalog-row.stories';

const {
  Material,
  MaterialAsLink,
  PendingOwn,
  RejectedOwn,
  PendingOther,
  CompactPending,
  SpoolType,
  SpoolTypePending,
  AdminPending,
  AdminRejected,
  AdminApprovedInUse,
  BoardCatalogMaterials,
  BoardCatalogMobile,
  BoardAdminTable,
} = composeStories(stories);

describe('CatalogRow', () => {
  it('shows a material with its stock and type, and opens it', async () => {
    const onOpen = fn();
    render(<Material onOpen={onOpen} />);
    expect(screen.getByText('In your stock · 3')).toBeInTheDocument();
    expect(screen.getByText('PLA')).toBeInTheDocument();
    // Approved entries carry no status tag outside the admin view.
    expect(screen.queryByText('Approved')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Galaxy Black' }));
    expect(onOpen).toHaveBeenCalledOnce();
  });

  it('renders the name as a link when given an href', () => {
    render(<MaterialAsLink />);
    expect(screen.getByRole('link', { name: 'Galaxy Purple' })).toHaveAttribute(
      'href',
      '#materials/cat-galaxy-purple'
    );
  });

  it.each([
    ['pending', PendingOwn, 'Pending review', 'yours · editable'],
    ['rejected', RejectedOwn, 'Rejected', 'yours · edit to resubmit'],
  ])('tells the submitter what they can do (%s)', (_, Story, status, hint) => {
    render(<Story />);
    expect(screen.getByText(status)).toBeInTheDocument();
    expect(screen.getByText(hint)).toBeInTheDocument();
  });

  it("shows only the status on someone else's entry", () => {
    render(<PendingOther />);
    expect(screen.getByText('Pending review')).toBeInTheDocument();
    expect(screen.queryByText(/yours/)).not.toBeInTheDocument();
    // Not openable: no link, no button, no chevron.
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('stacks the hints under the name in the compact layout', () => {
    render(<CompactPending />);
    const hints = screen.getByRole('button', { name: 'Galaxy Blue' })
      .nextElementSibling as HTMLElement;
    expect(within(hints).getByText('Pending review')).toBeInTheDocument();
    expect(within(hints).getByText('yours · editable')).toBeInTheDocument();
  });

  it('shows the empty weight and usage of a spool type', () => {
    const { container } = render(<SpoolType />);
    expect(screen.getByText('Cardboard 1 kg')).toBeInTheDocument();
    expect(screen.getByText('In use · 9')).toBeInTheDocument();
    expect(
      container.querySelector('[data-slot="weight-display"]')
    ).toHaveTextContent('193 g');
  });

  it("marks the viewer's pending spool type", () => {
    render(<SpoolTypePending />);
    expect(screen.getByText('Pending review')).toBeInTheDocument();
    expect(screen.getByText('yours · editable')).toBeInTheDocument();
  });
});

describe('CatalogRowActions', () => {
  it('offers every action on a pending entry, without opening the row', async () => {
    const onOpen = fn();
    const onApprove = fn();
    const onReject = fn();
    const onEdit = fn();
    const onDelete = fn();
    render(
      <AdminPending
        onOpen={onOpen}
        actions={
          <CatalogRowActions
            status="pending"
            name="Galaxy Blue"
            onApprove={onApprove}
            onReject={onReject}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        }
      />
    );
    for (const name of ['Approve', 'Reject', 'Edit', 'Delete']) {
      await userEvent.click(
        screen.getByRole('button', { name: `${name} Galaxy Blue` })
      );
    }
    expect(onApprove).toHaveBeenCalledOnce();
    expect(onReject).toHaveBeenCalledOnce();
    expect(onEdit).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('can approve but not reject a rejected entry', () => {
    render(<AdminRejected />);
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Approve Silk Rainbow' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Reject Silk Rainbow' })
    ).not.toBeInTheDocument();
  });

  it('shows the approved status and blocks deleting an entry in use', () => {
    render(<AdminApprovedInUse />);
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Approve|Reject/ })
    ).not.toBeInTheDocument();
    const del = screen.getByRole('button', { name: 'Delete Galaxy Black' });
    expect(del).toBeDisabled();
    expect(del.parentElement).toHaveAttribute('title', 'In use by 12 spools');
  });

  it('hides actions without a callback and disables all while busy', () => {
    render(
      <CatalogRowActions status="pending" name="Mint" onEdit={fn()} busy />
    );
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Edit Mint' })).toBeDisabled();
  });
});

describe('catalog boards', () => {
  it('groups the desktop catalog by manufacturer under the toolbar', async () => {
    render(<BoardCatalogMaterials />);
    for (const name of ['Bambu Lab', 'Prusament', 'Sunlu']) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
    expect(
      screen.getByText('Showing first 150 of 1,204 — refine your search.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Remove filter Density 1.2–1.3 g/cm³' })
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: 'Filters 1 active' })
    );
    expect(screen.getByRole('region', { name: 'Filters' })).toBeInTheDocument();
  });

  it('opens the mobile filters as a sheet', async () => {
    render(<BoardCatalogMobile />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Filters, 1 active' })
    );
    expect(
      await screen.findByRole('button', { name: 'Show 1,204 materials' })
    ).toBeInTheDocument();
  });

  it('heads the admin table and filters it by status', async () => {
    render(<BoardAdminTable />);
    expect(
      screen.getAllByRole('columnheader').map((th) => th.textContent)
    ).toEqual(['Material', 'Type', 'Status', 'Submitted', 'Actions']);
    expect(screen.getAllByRole('button', { name: /^Approve / })).toHaveLength(4);
    expect(
      screen.getByRole('button', { name: 'Delete Galaxy Black' })
    ).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Rejected 1' }));
    expect(screen.getAllByRole('row')).toHaveLength(2);
  });
});
