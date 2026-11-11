import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';

import * as stories from './spool-type-catalog-view.stories';

const { Default, Searched, RequestOpen } = composeStories(stories);

describe('SpoolTypeCatalogView', () => {
  it('groups spool types by manufacturer with weight and usage', () => {
    render(<Default />);
    const prusament = screen.getByRole('region', { name: 'Prusament' });
    expect(within(prusament).getByText('Cardboard 1 kg')).toBeVisible();
    expect(within(prusament).getByText('In use · 9')).toBeVisible();
    expect(screen.getByText(/Showing 6 of 6/)).toBeVisible();
  });

  it('filters by tokens across manufacturer and name', () => {
    render(<Searched />);
    expect(screen.getAllByRole('region')).toHaveLength(1);
    expect(screen.getByText('Cardboard 2 kg')).toBeVisible();
    expect(screen.queryByText('Cardboard 1 kg')).toBeNull();
  });

  it('opens only the viewer’s own pending or rejected entries for editing', async () => {
    const onEdit = fn();
    render(<Default onEdit={onEdit} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Cardboard 3 kg' })
    );
    expect(onEdit).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'st-polymaker-3' })
    );
    // Someone else's rejected entry is not editable.
    expect(screen.queryByRole('button', { name: 'Cardboard 2 kg' })).toBeNull();
  });

  it('shows the request panel', async () => {
    render(<RequestOpen />);
    const panel = await screen.findByRole('dialog');
    expect(
      within(panel).getByRole('heading', { name: 'Request a new spool type' })
    ).toBeVisible();
  });
});
