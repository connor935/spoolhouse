import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as stories from './borrows-view.stories';

const { Default, Pending, Empty } = composeStories(stories);

const section = (name: RegExp) =>
  screen.getByRole('region', { name }) as HTMLElement;

describe('BorrowsView', () => {
  it('sums up the lends in the header', () => {
    render(<Default />);
    expect(
      screen.getByText('2 requests · 1 lent out · 1 borrowed')
    ).toBeInTheDocument();
  });

  it('wires each section action to its lend id', async () => {
    const user = userEvent.setup();
    render(<Default />);

    const incoming = section(/requests for your spools/i);
    await user.click(
      within(incoming).getAllByRole('button', { name: /approve/i })[1]
    );
    expect(Default.args.onApprove).toHaveBeenCalledWith('lend-2');
    await user.click(
      within(incoming).getAllByRole('button', { name: /decline/i })[0]
    );
    expect(Default.args.onDecline).toHaveBeenCalledWith('lend-1');

    await user.click(
      within(section(/your requests/i)).getByRole('button', { name: /cancel/i })
    );
    expect(Default.args.onCancel).toHaveBeenCalledWith('lend-3');

    await user.click(screen.getByRole('button', { name: /mark returned/i }));
    expect(Default.args.onMarkReturned).toHaveBeenCalledWith('lend-4');

    const weigh = screen.getByRole('button', { name: /weigh/i });
    await user.click(weigh);
    expect(Default.args.onWeigh).toHaveBeenCalledWith('lend-5', weigh);
  });

  it('lists history in the table', () => {
    render(<Default />);
    const table = within(section(/history/i)).getByRole('table');
    expect(within(table).getAllByRole('row').length).toBeGreaterThan(1);
  });

  it('disables only the pending lend', () => {
    render(<Pending />);
    const [first, second] = within(
      section(/requests for your spools/i)
    ).getAllByRole('button', { name: /approve/i });
    expect(first).toBeDisabled();
    expect(second).toBeEnabled();
  });

  it('explains every empty section', () => {
    render(<Empty />);
    expect(
      screen.getByText('0 requests · 0 lent out · 0 borrowed')
    ).toBeInTheDocument();
    expect(screen.getByText(/nobody is waiting/i)).toBeInTheDocument();
    expect(screen.getByText(/no open requests/i)).toBeInTheDocument();
    expect(
      screen.getByText(/none of your spools are out/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/aren't borrowing anything/i)).toBeInTheDocument();
    expect(
      screen.getByText(/returned and declined lends/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
