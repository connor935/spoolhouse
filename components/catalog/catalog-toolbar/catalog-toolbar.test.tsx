import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';

import * as stories from './catalog-toolbar.stories';

const { Default, Busy, SearchOnly, Mobile } = composeStories(stories);

describe('CatalogToolbar', () => {
  it('shows the formatted match count', () => {
    render(<Default />);
    expect(screen.getByText('1,204').parentElement).toHaveTextContent(
      '1,204 of 23,871'
    );
  });

  it('reports typing, filters and clear', async () => {
    const onQueryChange = fn();
    const onFiltersClick = fn();
    const onClear = fn();
    render(
      <Default
        query=""
        onQueryChange={onQueryChange}
        onFiltersClick={onFiltersClick}
        onClear={onClear}
      />
    );
    await userEvent.type(
      screen.getByRole('searchbox', { name: 'Search materials' }),
      'x'
    );
    expect(onQueryChange).toHaveBeenCalledWith('x');
    await userEvent.click(screen.getByRole('button', { name: /Filters/ }));
    expect(onFiltersClick).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('says when a search is running', () => {
    render(<Busy />);
    expect(screen.getByText('Searching…')).toBeVisible();
  });

  it('hides filters and clear when there is nothing to clear', () => {
    render(<SearchOnly />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('collapses to an icon filters button on phones', () => {
    render(<Mobile />);
    expect(
      screen.getByRole('button', { name: 'Filters, 1 active' })
    ).toBeVisible();
    expect(screen.queryByText('1,204')).toBeNull();
  });
});
