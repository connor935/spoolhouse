import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as stories from './bottom-nav.stories';

const { Default, NothingWaiting } = composeStories(stories);

describe('BottomNav', () => {
  it('renders the five mobile destinations', () => {
    render(<Default />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((l) => l.getAttribute('href'))
    ).toEqual(['/', '/inventory', '/borrows', '/groups', '/stats']);
    for (const label of ['Home', 'Stock', 'Groups', 'Stats']) {
      expect(within(nav).getByRole('link', { name: label })).toBeVisible();
    }
  });

  it('marks the active destination', () => {
    render(<Default />);
    expect(screen.getByRole('link', { name: 'Stock' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute(
      'aria-current'
    );
  });

  it('shows a badge on Borrows when a request waits', () => {
    render(<Default />);
    const borrows = screen.getByRole('link', {
      name: /^Borrows\s*, 1 open request$/,
    });
    expect(borrows.querySelector('[data-slot=nav-badge]')).toHaveTextContent(
      '1'
    );
  });

  it('shows no badge when nothing waits', () => {
    const { container } = render(<NothingWaiting />);
    expect(container.querySelector('[data-slot=nav-badge]')).toBeNull();
    expect(screen.getByRole('link', { name: 'Borrows' })).toBeVisible();
  });
});
