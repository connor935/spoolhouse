import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as stories from './stats-view.stories';

const { Default, NoUsage } = composeStories(stories);

const section = (name: RegExp) =>
  screen.getByRole('region', { name }) as HTMLElement;

describe('StatsView', () => {
  it('shows the key figures with the usage delta', () => {
    render(<Default />);
    const figures = section(/key figures/i);
    expect(figures).toHaveTextContent('Used · 30 days');
    expect(figures).toHaveTextContent('−12 % vs. prev. 30 days');
    expect(figures).toHaveTextContent('11/14 priced');
  });

  it('toggles the monthly chart between grams and cost', async () => {
    const user = userEvent.setup();
    render(<Default />);
    const usage = section(/monthly usage/i);
    expect(usage).toHaveTextContent('12.84 kg');
    expect(usage).toHaveTextContent('Dec 2025 – Nov 2026');

    await user.click(within(usage).getByRole('button', { name: 'Cost' }));
    expect(usage).not.toHaveTextContent('12.84 kg');
    expect(usage).toHaveTextContent('€');
  });

  it('lists materials with the idle ones at the bottom', () => {
    render(<Default />);
    const rows = within(section(/by material/i)).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Basic Cyan');
    expect(rows.at(-1)).toHaveTextContent('No recent use');
  });

  it('shows the stock composition total by type', () => {
    render(<Default />);
    expect(section(/by filament type/i)).toHaveTextContent(
      'Stock composition · 8.09 kg'
    );
  });

  it('replaces the chart with an empty state without usage', () => {
    render(<NoUsage />);
    const usage = section(/monthly usage/i);
    expect(usage).toHaveTextContent('No usage yet');
    expect(
      within(usage).queryByRole('group', { name: 'Chart metric' })
    ).not.toBeInTheDocument();
    expect(section(/key figures/i)).toHaveTextContent('no previous 30 days');
  });
});
