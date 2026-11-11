import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './import-progress.stories';

const { Running, Failed, FailedFirst, Done, DoneSingle } =
  composeStories(stories);

describe('ImportProgress', () => {
  it('shows the manufacturer in flight and the queue', () => {
    render(<Running />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Importing 2 of 3 — prusament…');
    expect(status).toHaveTextContent('esun ✓ · prusament · sunlu');
    expect(
      screen.getByRole('meter', { name: 'Import progress' })
    ).toHaveAttribute('aria-valuenow', '33');
  });

  it('names where it stopped, what got imported and what was skipped', () => {
    render(<Failed />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Import stopped at prusament.');
    expect(alert).toHaveTextContent('SpoolmanDB returned 502 Bad Gateway.');
    expect(alert).toHaveTextContent('esun was imported; sunlu was skipped.');
  });

  it('retries a failed run', async () => {
    const onRetry = fn();
    render(<Failed onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('says when nothing was imported', () => {
    render(<FailedFirst />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Nothing was imported; prusament, sunlu were skipped.'
    );
  });

  it('confirms a finished run', () => {
    const { unmount } = render(<Done />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Imported 3 manufacturers: esun, prusament, sunlu.'
    );
    unmount();
    render(<DoneSingle />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Imported 1 manufacturer: polymaker.'
    );
  });
});
