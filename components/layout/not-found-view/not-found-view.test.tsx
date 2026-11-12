import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as stories from './not-found-view.stories';

const { Default } = composeStories(stories);

describe('NotFoundView', () => {
  it('names the error in the page heading', () => {
    render(<Default />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Nothing on this shelf' })
    ).toBeVisible();
    expect(screen.getByText('Error · shelf not found')).toBeVisible();
  });

  it('links back to the overview and the catalog', () => {
    render(<Default />);
    expect(
      screen.getByRole('link', { name: 'Back to overview' })
    ).toHaveAttribute('href', '/');
    expect(
      screen.getByRole('link', { name: 'Search catalog' })
    ).toHaveAttribute('href', '/materials');
  });
});
