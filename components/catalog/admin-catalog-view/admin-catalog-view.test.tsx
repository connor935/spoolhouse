import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';

import * as stories from './admin-catalog-view.stories';

const { Default, NothingToReview, NoResults } = composeStories(stories);

describe('AdminCatalogView', () => {
  it('links to the review queue with the pending count', () => {
    render(<Default />);
    expect(
      screen.getByRole('link', { name: /Review pending \(3\)/ })
    ).toHaveAttribute('href', '/admin/materials/review');
  });

  it('disables the review shortcut when nothing is pending', () => {
    render(<NothingToReview />);
    expect(screen.queryByRole('link', { name: /Review pending/ })).toBeNull();
    expect(
      screen.getByRole('button', { name: /Nothing to review/ })
    ).toBeDisabled();
  });

  it('filters by status', async () => {
    const onStatusChange = fn();
    render(<Default onStatusChange={onStatusChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Pending 3' }));
    expect(onStatusChange).toHaveBeenCalledWith('pending');
    expect(screen.queryByText('Galaxy Black')).toBeNull();
    expect(screen.getByText('Galaxy Blue')).toBeInTheDocument();
  });

  it('says how much of a long result is shown and loads more', async () => {
    const onLoadMore = fn();
    render(<Default onLoadMore={onLoadMore} />);
    expect(screen.getByText(/Showing first 5 of 23,868/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    expect(onLoadMore).toHaveBeenCalled();
  });

  it('offers to clear an empty search', async () => {
    const onClear = fn();
    render(<NoResults onClear={onClear} />);
    expect(screen.getByText('Nothing matches')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Clear filters' })
    );
    expect(onClear).toHaveBeenCalled();
  });
});
