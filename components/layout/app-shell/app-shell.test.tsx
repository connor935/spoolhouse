import { composeStories } from '@storybook/react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './app-shell.stories';

const { Desktop, Mobile } = composeStories(stories);

// jsdom applies no CSS, so the desktop sidebar and the mobile chrome are both
// in the tree; queries scope to the part under test.
const sidebar = (c: HTMLElement) =>
  c.querySelector<HTMLElement>('[data-slot=app-sidebar]')!;
const bottomNav = (c: HTMLElement) =>
  c.querySelector<HTMLElement>('[data-slot=bottom-nav]')!;

describe('AppShell', () => {
  it('renders the page into the one main landmark with a skip link', () => {
    render(<Desktop />);
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main');
    expect(
      within(main).getByRole('heading', { level: 1, name: 'Statistics' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Skip to content' })
    ).toHaveAttribute('href', '#main');
  });

  it('derives the active item from the path', () => {
    const { container } = render(<Desktop />);
    expect(
      within(sidebar(container)).getByRole('link', { name: 'Statistics' })
    ).toHaveAttribute('aria-current', 'page');
    expect(
      within(bottomNav(container)).getByRole('link', { name: 'Stats' })
    ).toHaveAttribute('aria-current', 'page');
  });

  it('maps a group page to the group in the sidebar and Groups below', () => {
    const { container } = render(<Mobile />);
    expect(
      within(sidebar(container)).getByRole('link', {
        name: /^Print Farm Friends/,
      })
    ).toHaveAttribute('aria-current', 'page');
    expect(
      within(bottomNav(container)).getByRole('link', { name: 'Groups' })
    ).toHaveAttribute('aria-current', 'page');
  });

  it('opens the drawer from the top bar and closes it on navigation', async () => {
    render(<Mobile />);
    const toggle = screen.getByRole('button', { name: 'Open navigation' });
    await userEvent.click(toggle);
    const drawer = await screen.findByRole('dialog', { name: 'Navigation' });
    const link = within(drawer).getByRole('link', { name: 'Materials' });
    link.addEventListener('click', (e) => e.preventDefault());
    await userEvent.click(link);
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    );
  });

  it('reports sidebar collapse so the container can persist it', async () => {
    const onCollapsedChange = fn();
    const { container } = render(
      <Desktop onCollapsedChange={onCollapsedChange} />
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Collapse sidebar' })
    );
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
    expect(sidebar(container)).toHaveAttribute('data-collapsed', 'true');
  });
});
