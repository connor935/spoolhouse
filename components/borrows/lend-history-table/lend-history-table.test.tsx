import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import * as stories from './lend-history-table.stories';

const { Default, UnknownUsage, HistorySection } = composeStories(stories);

function rows() {
  // Skip the header row.
  return screen.getAllByRole('row').slice(1);
}

describe('LendHistoryTable', () => {
  it('has the Borrows 05 columns', () => {
    render(<Default />);
    expect(
      screen.getAllByRole('columnheader').map((th) => th.textContent)
    ).toEqual(['Spool', 'With', 'Group', 'Period', 'Status', 'Used', 'Cost']);
  });

  it('shows a returned lend with period, used grams and cost', () => {
    render(<Default />);
    const cells = within(rows()[0]).getAllByRole('cell');
    expect(cells[0]).toHaveTextContent('#02 Prusa Orange');
    expect(cells[1]).toHaveTextContent('Lent to Tom Richter');
    expect(cells[2]).toHaveTextContent('Print Farm Friends');
    expect(cells[3]).toHaveTextContent('02 Sep – 18 Sep');
    expect(cells[4]).toHaveTextContent('Returned');
    expect(cells[5]).toHaveTextContent('−212 g');
    expect(cells[6]).toHaveTextContent('€5.30');
  });

  it('marks borrowed lends with the other direction', () => {
    render(<Default />);
    expect(within(rows()[1]).getAllByRole('cell')[1]).toHaveTextContent(
      'Borrowed from Mia Koch'
    );
  });

  it.each([
    [2, 'Declined', '30 Jul'],
    [3, 'Cancelled', '11 Jul'],
  ])(
    'row %i: %s requests have one date and no usage',
    (index, status, date) => {
      render(<Default />);
      const cells = within(rows()[index]).getAllByRole('cell');
      expect(cells[3]).toHaveTextContent(new RegExp(`^${date}$`));
      expect(cells[4]).toHaveTextContent(status);
      expect(cells[5]).toHaveTextContent('none');
      expect(cells[6]).toHaveTextContent('none');
    }
  );

  it('shows a dash when usage or price is unknown', () => {
    render(<UnknownUsage />);
    const [old, unpriced] = rows().map((r) => within(r).getAllByRole('cell'));
    expect(old[5]).toHaveTextContent('none');
    expect(unpriced[5]).toHaveTextContent('−58 g');
    expect(unpriced[6]).toHaveTextContent('none');
  });

  it('composes the Borrows 05 section', () => {
    render(<HistorySection />);
    expect(
      screen.getByRole('heading', { name: 'History' })
    ).toBeInTheDocument();
    expect(rows()).toHaveLength(4);
  });
});
