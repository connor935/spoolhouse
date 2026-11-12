import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './weighing-history-list.stories';

const { Default, Undoing, Single, Loading } = composeStories(stories);

describe('WeighingHistoryList', () => {
  it('lists weighings newest first as filament left and total', () => {
    render(<Default />);
    const rows = within(
      screen.getByRole('list', { name: 'Weighing history' })
    ).getAllByRole('listitem');
    expect(rows).toHaveLength(4);
    expect(rows[0]).toHaveTextContent('10 Nov 2026 · 14:02');
    expect(rows[0]).toHaveTextContent('742 g');
    expect(rows[0]).toHaveTextContent('(935 g total)');
    expect(rows[3]).toHaveTextContent('1.00 kg');
  });

  it('undoes the last weighing', async () => {
    const onUndo = fn();
    render(<Default onUndo={onUndo} />);
    await userEvent.click(screen.getByRole('button', { name: 'Undo last' }));
    expect(onUndo).toHaveBeenCalledOnce();
  });

  it('disables undo while it runs and hides it without an older weighing', () => {
    const { unmount } = render(<Undoing />);
    expect(screen.getByRole('button', { name: 'Undo last' })).toBeDisabled();
    unmount();
    render(<Single />);
    expect(screen.queryByRole('button', { name: 'Undo last' })).toBeNull();
  });

  it('says it is loading before the history arrives', () => {
    render(<Loading />);
    expect(screen.getByText('Loading…')).toBeVisible();
  });
});
