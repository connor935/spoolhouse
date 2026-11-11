import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as stories from './join-group-card.stories';

const { Default, Joining, AlreadyMember } = composeStories(stories);

describe('JoinGroupCard', () => {
  it('asks to join and shows what the group holds', () => {
    render(<Default />);
    expect(
      screen.getByRole('heading', { name: 'Join “Print Farm Friends”?' })
    ).toBeInTheDocument();
    expect(screen.getByText('23')).toBeInTheDocument();
    expect(screen.getByText('Anna Weber')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute(
      'href',
      '/groups'
    );
  });

  it('Join group calls onJoin; disabled while joining', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Default />);
    await user.click(screen.getByRole('button', { name: 'Join group' }));
    expect(Default.args.onJoin).toHaveBeenCalled();
    unmount();
    render(<Joining />);
    expect(screen.getByRole('button', { name: 'Joining…' })).toBeDisabled();
  });

  it('members get a link to the group instead', () => {
    render(<AlreadyMember />);
    expect(
      screen.queryByRole('button', { name: 'Join group' })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open group' })).toHaveAttribute(
      'href',
      '/groups/group-farm'
    );
  });
});
