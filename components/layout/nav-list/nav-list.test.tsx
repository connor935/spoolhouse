import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './nav-list.stories';

const { Default, Large } = composeStories(stories);

describe('NavList', () => {
  it('renders one navigation landmark per section', () => {
    render(<Default />);
    expect(
      screen.getAllByRole('navigation').map((n) => n.getAttribute('aria-label'))
    ).toEqual(['Main', 'Catalog', 'Admin']);
  });

  it('marks the active item and gives it the accent bar', () => {
    render(<Default />);
    const active = screen.getByRole('link', { name: /^Notifications/ });
    expect(active).toHaveAttribute('aria-current', 'page');
    expect(active.className).toContain('before:bg-accent');
  });

  it('caps pills at 9+ and keeps the full number for screen readers', () => {
    render(
      <Default
        sections={[
          {
            key: 'main',
            items: [
              {
                key: 'notifications',
                href: '/notifications',
                label: 'Notifications',
                badge: { value: 12, tone: 'pill', label: '12 unread' },
              },
            ],
          },
        ]}
      />
    );
    const link = screen.getByRole('link', { name: /12 unread/ });
    expect(link.querySelector('[data-slot=nav-badge]')).toHaveTextContent('9+');
  });

  it('reports navigation so a drawer can close', async () => {
    const onNavigate = fn();
    render(<Large onNavigate={onNavigate} />);
    // Links point at real routes; keep jsdom from following them.
    const link = screen.getByRole('link', { name: 'Statistics' });
    link.addEventListener('click', (e) => e.preventDefault());
    await userEvent.click(link);
    expect(onNavigate).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole('navigation', { name: 'Admin' })
    ).not.toBeInTheDocument();
  });
});
