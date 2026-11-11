import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';

import * as stories from './material-catalog-view.stories';

const { Default, RequestOpen, Admin, NoResults, AllShown, Mobile } =
  composeStories(stories);

describe('MaterialCatalogView', () => {
  it('groups rows by manufacturer with catalog totals', () => {
    render(<Default />);
    const prusament = screen.getByRole('region', { name: 'Prusament' });
    expect(
      within(prusament).getByRole('heading', { name: 'Prusament' })
    ).toBeVisible();
    expect(within(prusament).getByText('96')).toBeVisible();
    expect(within(prusament).getByText('In your stock · 3')).toBeVisible();
  });

  it('links every row to its material page', () => {
    render(<Default />);
    expect(screen.getByRole('link', { name: 'Galaxy Black' })).toHaveAttribute(
      'href',
      '/materials/cat-galaxy-black'
    );
  });

  it('marks the viewer’s pending and rejected entries', () => {
    render(<Default />);
    expect(screen.getByText('yours · editable')).toBeVisible();
    expect(screen.getByText('yours · edit to resubmit')).toBeVisible();
  });

  it('shows active filter chips and removes one', async () => {
    const onFilterChange = fn();
    render(<Default onFilterChange={onFilterChange} />);
    await userEvent.click(
      screen.getByRole('button', { name: /Remove .*Density/ })
    );
    expect(onFilterChange).toHaveBeenCalledWith(
      expect.objectContaining({ propertyConstraints: [] })
    );
  });

  it('opens the filter panel from the toolbar', async () => {
    render(<Default />);
    expect(screen.queryByRole('region', { name: 'Filters' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Filters/ }));
    expect(screen.getByRole('region', { name: 'Filters' })).toBeVisible();
  });

  it('loads more while matches exceed the page', async () => {
    const onLoadMore = fn();
    render(<Default onLoadMore={onLoadMore} />);
    expect(
      screen.getByText('Showing first 9 of 1,204 — refine your search.')
    ).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it('drops Load more once everything is shown', () => {
    render(<AllShown />);
    expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
  });

  it('opens the request panel with the form', async () => {
    const onRequestOpenChange = fn();
    const { unmount } = render(
      <Default onRequestOpenChange={onRequestOpenChange} />
    );
    await userEvent.click(
      screen.getByRole('button', { name: /Request material/ })
    );
    expect(onRequestOpenChange).toHaveBeenCalledWith(true);
    unmount();
    render(<RequestOpen />);
    const panel = await screen.findByRole('dialog');
    expect(
      within(panel).getByRole('heading', { name: 'Request a new material' })
    ).toBeVisible();
    expect(within(panel).getByLabelText('Manufacturer')).toBeVisible();
  });

  it('words the page for admins', () => {
    render(<Admin />);
    expect(screen.getByRole('button', { name: /Add material/ })).toBeVisible();
  });

  it('explains an empty result', () => {
    render(<NoResults />);
    expect(screen.getByText('No materials match')).toBeVisible();
  });

  it('uses compact rows and a filters sheet on phones', async () => {
    render(<Mobile />);
    expect(screen.getByText('1,204 of 23,871')).toBeVisible();
    await userEvent.click(
      screen.getByRole('button', { name: 'Filters, 1 active' })
    );
    expect(await screen.findByRole('dialog')).toBeVisible();
  });
});
