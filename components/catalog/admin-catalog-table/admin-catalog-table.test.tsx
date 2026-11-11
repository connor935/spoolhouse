import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';

import * as stories from './admin-catalog-table.stories';

const { Materials, SpoolTypes, Busy } = composeStories(stories);

const row = (name: string) =>
  screen.getByRole('link', { name: new RegExp(name) }).closest('tr')!;

describe('AdminCatalogTable', () => {
  it('lists entries with status, submitter and age, linking to the detail page', () => {
    render(<Materials />);
    const galaxy = row('Galaxy Blue');
    expect(
      within(galaxy).getByRole('link', { name: 'Sunlu · Galaxy Blue' })
    ).toHaveAttribute('href', '/materials/adm-galaxy-blue?from=admin');
    expect(within(galaxy).getByText('Anna Weber')).toBeInTheDocument();
    expect(within(galaxy).getAllByText('2 h ago').length).toBeGreaterThan(0);
    expect(
      within(row('Galaxy Black')).getByText('Imported')
    ).toBeInTheDocument();
  });

  it('offers Approve and Reject only where the status allows', () => {
    render(<Materials />);
    expect(
      within(row('Galaxy Blue')).getByRole('button', {
        name: 'Reject Galaxy Blue',
      })
    ).toBeEnabled();
    const rejected = row('Silk Rainbow');
    expect(
      within(rejected).getByRole('button', { name: 'Approve Silk Rainbow' })
    ).toBeEnabled();
    expect(
      within(rejected).queryByRole('button', { name: /Reject/ })
    ).toBeNull();
    expect(
      within(row('Galaxy Black')).queryByRole('button', { name: /Approve/ })
    ).toBeNull();
  });

  it('blocks deleting an entry that spools still use', () => {
    render(<Materials />);
    expect(
      screen.getByRole('button', { name: 'Delete Galaxy Black' })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Delete Easy PETG Bottle Green' })
    ).toBeEnabled();
  });

  it('passes the row to the callbacks', async () => {
    const onApprove = fn();
    const onEdit = fn();
    render(<Materials onApprove={onApprove} onEdit={onEdit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Approve Mint' }));
    await userEvent.click(screen.getByRole('button', { name: 'Edit Mint' }));
    expect(onApprove).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'adm-mint' })
    );
    expect(onEdit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'adm-mint' })
    );
  });

  it('disables the busy row only', () => {
    render(<Busy />);
    expect(
      screen.getByRole('button', { name: 'Approve Galaxy Blue' })
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Approve Mint' })).toBeEnabled();
  });

  it('renders spool types without swatches or links', () => {
    render(<SpoolTypes />);
    expect(
      screen.getByRole('columnheader', { name: 'Spool type' })
    ).toBeVisible();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });
});
