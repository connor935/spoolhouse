import { composeStories } from '@storybook/react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as stories from './stock-composition-bar.stories';

const { Default, EvenSplit, ManyTypes, Empty } = composeStories(stories);

const percents = (container: HTMLElement) =>
  [
    ...container.querySelectorAll('[data-slot="stock-composition-percent"]'),
  ].map((el) => Number(el.textContent!.replace('%', '')));

describe('StockCompositionBar', () => {
  it('shows one segment per type, largest first, with the total', () => {
    const { container } = render(<Default />);
    const segments = screen.getAllByRole('img');
    expect(segments.map((s) => s.getAttribute('aria-label'))).toEqual([
      'PLA: 5,977 g, 74%',
      'PETG: 1,301 g, 16%',
      'ASA: 812 g, 10%',
    ]);
    expect(screen.getByText(/8\.09 kg/)).toBeInTheDocument();
    expect(percents(container)).toEqual([74, 16, 10]);
  });

  it('labels only segments wide enough inline', () => {
    render(<Default />);
    expect(screen.getByText('PLA 74%')).toBeInTheDocument();
    expect(screen.queryByText('ASA 10%')).not.toBeInTheDocument();
  });

  it('keeps percentages summing to 100 after rounding', () => {
    const { container } = render(<EvenSplit />);
    expect(percents(container)).toEqual([34, 33, 33]);
  });

  it('folds the smallest types into Other', () => {
    const { container } = render(<ManyTypes />);
    const names = screen
      .getAllByRole('img')
      .map((s) => s.getAttribute('aria-label')!.split(':')[0]);
    expect(names).toEqual(['PLA', 'PETG', 'ASA', 'Other']);
    expect(percents(container).reduce((s, v) => s + v, 0)).toBe(100);
  });

  it('shows a readout on hover and focus', async () => {
    render(<Default />);
    const [pla, petg] = screen.getAllByRole('img');
    fireEvent.pointerEnter(petg);
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'PETG · 1,301 g · 16%'
    );
    fireEvent.pointerLeave(petg);
    await userEvent.tab();
    expect(pla).toHaveFocus();
    expect(screen.getByRole('tooltip')).toHaveTextContent('PLA · 5,977 g');
  });

  it('shows an empty state without stock', () => {
    render(<Empty />);
    expect(screen.queryAllByRole('img')).toHaveLength(0);
    expect(screen.getByText('No filament in stock')).toBeInTheDocument();
  });
});
