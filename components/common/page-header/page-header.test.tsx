import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import { Button } from '@/components/ui/button';
import * as stories from './page-header.stories';

const { Default, WithBreadcrumb, WithDescription, PageSkeleton } =
  composeStories(stories);

describe('PageHeader', () => {
  it('renders the title as the one h1, with kicker and meta', () => {
    render(<Default />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Overview'
    );
    expect(screen.getByText('01')).toBeInTheDocument();
    expect(
      screen.getByText('Mon 09 Nov 2026 · last weighing 14:02')
    ).toBeInTheDocument();
  });

  it('renders actions', async () => {
    const onClick = fn();
    render(<Default actions={<Button onClick={onClick}>Add spool</Button>} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add spool' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('draws the ink rule by default and drops it with rule={false}', () => {
    const { container, rerender } = render(<Default />);
    const header = () => container.querySelector('header')!;
    expect(header().className).toContain('border-b-2');
    rerender(<Default rule={false} />);
    expect(header().className).not.toContain('border-b-2');
  });

  it('renders a breadcrumb: links for earlier crumbs, current page last', () => {
    render(<WithBreadcrumb />);
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(nav).getByRole('link', { name: 'Inventory' })).toHaveAttribute(
      'href',
      '/inventory'
    );
    const current = within(nav).getByText('Galaxy Black');
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(within(nav).queryByRole('link', { name: 'Galaxy Black' })).toBeNull();
  });

  it('shows badges and the description line', () => {
    render(<WithBreadcrumb />);
    expect(screen.getByText('PLA')).toBeInTheDocument();
    expect(screen.getByText('Pending review')).toBeInTheDocument();
    render(<WithDescription />);
    expect(screen.getByText(/Pull manufacturers/)).toBeInTheDocument();
  });

  it('composes into the page skeleton with h1 > h2 headings', () => {
    render(<PageSkeleton />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    ).toEqual(['Running low', 'Monthly usage']);
    expect(screen.getByRole('region', { name: 'Key figures' })).toBeInTheDocument();
  });
});
