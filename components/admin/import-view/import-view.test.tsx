import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as stories from './import-view.stories';

const { Default, Interactive, Running, Failed, Done, NoMatch } =
  composeStories(stories);

const selectAll = () =>
  screen.getByRole('checkbox', { name: /select all visible/i });

describe('ImportView', () => {
  it('imports the selection', async () => {
    const user = userEvent.setup();
    render(<Default />);
    expect(screen.getByText('7 of 7')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Import 3 selected' }));
    expect(Default.args.onImport).toHaveBeenCalled();
  });

  it('selects all visible manufacturers, then none', async () => {
    const user = userEvent.setup();
    render(<Interactive />);
    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();

    await user.type(screen.getByRole('searchbox'), 'prus');
    expect(screen.getByText('1 of 7')).toBeVisible();
    await user.click(selectAll());
    expect(
      screen.getByRole('button', { name: 'Import 1 selected' })
    ).toBeEnabled();
    expect(Interactive.args.onSelectedChange).toHaveBeenLastCalledWith(
      new Set(['prusament'])
    );

    await user.click(selectAll());
    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();
  });

  it('marks select-all as mixed when only some are selected', () => {
    render(<Default />);
    expect(selectAll()).toHaveAttribute('aria-checked', 'mixed');
  });

  it('toggles one row', async () => {
    const user = userEvent.setup();
    render(<Default />);
    await user.click(screen.getByRole('checkbox', { name: /Bambu Lab/ }));
    expect(Default.args.onSelectedChange).toHaveBeenCalledWith(
      new Set(['esun', 'prusament', 'sunlu', 'bambulab'])
    );
  });

  it('locks the selection while a run is in flight', () => {
    render(<Running />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Importing 2 of 3 — prusament…'
    );
    expect(
      screen.getByRole('button', { name: 'Import 3 selected' })
    ).toBeDisabled();
    expect(selectAll()).toHaveAttribute('aria-disabled', 'true');
  });

  it('stops on the failing slug and offers Retry', async () => {
    const user = userEvent.setup();
    render(<Failed />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Import stopped at prusament.');
    expect(alert).toHaveTextContent('esun was imported; sunlu was skipped.');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(Failed.args.onRetry).toHaveBeenCalled();
  });

  it('notes a finished run', () => {
    render(<Done />);
    expect(
      screen.getByText(/Imported 3 manufacturers: esun, prusament, sunlu/)
    ).toBeVisible();
  });

  it('says when no manufacturer matches the search', () => {
    render(<NoMatch />);
    expect(screen.getByText('No manufacturers match')).toBeVisible();
  });
});
