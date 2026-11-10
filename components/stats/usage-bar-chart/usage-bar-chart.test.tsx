import { composeStories } from '@storybook/react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as stories from './usage-bar-chart.stories';

const { Default, Cost, WithMetricToggle, Compact, NoPrices, Empty } =
  composeStories(stories);

const bars = () => screen.getAllByRole('img');

describe('UsageBarChart', () => {
  it('renders one bar per month with an accessible label', () => {
    render(<Default />);
    expect(bars()).toHaveLength(12);
    expect(
      screen.getByRole('img', { name: 'October 2026: 1,620 g · €38.10' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('group', { name: /Peak 1\.62 kg in October 2026/ })
    ).toBeInTheDocument();
  });

  it('hatches only the current month', () => {
    render(<Default />);
    const hatched = bars().filter((b) => b.classList.contains('hatch-accent'));
    expect(hatched).toHaveLength(1);
    expect(hatched[0]).toBe(bars()[11]);
    expect(hatched[0]).toHaveAccessibleName(/month to date/);
  });

  it('labels the value axis with three ticks', () => {
    render(<Default />);
    for (const t of ['0.5', '1.0', '1.5']) {
      expect(screen.getByText(t)).toBeInTheDocument();
    }
    expect(screen.getByText(/kg \/ month/)).toBeInTheDocument();
  });

  it('shows a readout on hover', () => {
    render(<Default />);
    fireEvent.pointerEnter(bars()[10].parentElement!);
    const tip = screen.getByRole('tooltip');
    expect(tip).toHaveTextContent('Oct 2026');
    expect(tip).toHaveTextContent('1,620 g · €38.10');
    fireEvent.pointerLeave(bars()[10].parentElement!);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('is one tab stop; focus shows the readout and arrows move it', async () => {
    render(<Default />);
    await userEvent.tab();
    expect(bars()[11]).toHaveFocus();
    expect(screen.getByRole('tooltip')).toHaveTextContent('Nov 2026');
    await userEvent.keyboard('{ArrowLeft}');
    expect(bars()[10]).toHaveFocus();
    expect(bars()[10]).toHaveAttribute(
      'aria-describedby',
      screen.getByRole('tooltip').id
    );
    expect(screen.getByRole('tooltip')).toHaveTextContent('1,620 g');
    await userEvent.keyboard('{Home}');
    expect(bars()[0]).toHaveFocus();
  });

  it('leads with cost and switches the axis in the cost metric', () => {
    render(<Cost />);
    expect(
      screen.getByRole('img', { name: 'October 2026: €38.10 · 1,620 g' })
    ).toBeInTheDocument();
    expect(screen.getByText('€10')).toBeInTheDocument();
    expect(screen.getByText(/cost \/ month/)).toBeInTheDocument();
  });

  it('changes the plotted values when the metric toggle switches', async () => {
    render(<WithMetricToggle />);
    const heightBefore = bars()[0].style.height;
    await userEvent.click(screen.getByRole('button', { name: 'Cost' }));
    expect(bars()[0]).toHaveAccessibleName(/^December 2025: €/);
    expect(bars()[0].style.height).not.toBe(heightBefore);
  });

  it('leaves cost out of the readout without prices', () => {
    render(<NoPrices />);
    expect(
      screen.getByRole('img', { name: 'October 2026: 1,620 g' })
    ).toBeInTheDocument();
  });

  it('labels the peak in the compact variant', () => {
    render(<Compact />);
    expect(screen.queryByText(/kg \/ month/)).not.toBeInTheDocument();
    expect(screen.getByText('1.62 kg')).toBeInTheDocument();
  });

  it('shows an empty state without usage', () => {
    render(<Empty />);
    expect(screen.queryAllByRole('img')).toHaveLength(0);
    expect(screen.getByText('No usage recorded yet')).toBeInTheDocument();
  });
});
