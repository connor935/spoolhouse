import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as stories from './group-detail.stories';

const { Stock, Settings } = composeStories(stories);

describe('GroupDetail', () => {
  it('titles the page and links back to /groups', () => {
    render(<Stock />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Print Farm Friends' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Groups' })).toHaveAttribute(
      'href',
      '/groups'
    );
  });

  it('switches views by URL and marks the current one', () => {
    const { unmount } = render(<Stock />);
    const nav = screen.getByRole('navigation', { name: 'Group sections' });
    expect(within(nav).getByRole('link', { name: 'Stock' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(within(nav).getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/groups/group-farm?view=settings'
    );
    unmount();
    render(<Settings />);
    expect(
      screen.getByRole('link', { name: 'Settings', current: 'page' })
    ).toBeInTheDocument();
  });

  it('copies the invite link', async () => {
    const user = userEvent.setup();
    render(<Stock />);
    expect(screen.getByText('aB3xY9')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Copy invite link' }));
    expect(Stock.args.onCopyInvite).toHaveBeenCalled();
  });
});
