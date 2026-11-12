import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as stories from './groups-view.stories';

const { Default, NoGroups, Creating } = composeStories(stories);

describe('GroupsView', () => {
  it('lists a card per group linking to its page, and totals the stock', () => {
    render(<Default />);
    expect(
      screen.getByRole('link', { name: 'Print Farm Friends' })
    ).toHaveAttribute('href', '/groups/group-farm');
    expect(
      screen.getByRole('link', { name: 'Makerspace Kiel' })
    ).toBeInTheDocument();
    expect(screen.getByText('2 groups · 84 shared spools')).toBeInTheDocument();
  });

  it('creates with the trimmed name; empty input cannot submit', async () => {
    const user = userEvent.setup();
    render(<Default />);
    const create = screen.getByRole('button', { name: 'Create' });
    expect(create).toBeDisabled();
    await user.type(screen.getByLabelText('Group name'), '  Garage Lab  ');
    await user.click(create);
    expect(Default.args.onCreate).toHaveBeenCalledWith('Garage Lab');
  });

  it('joins with the entered code on Enter', async () => {
    const user = userEvent.setup();
    render(<Default />);
    await user.type(screen.getByLabelText('Invite code'), 'aB3xY9{Enter}');
    expect(Default.args.onJoin).toHaveBeenCalledWith('aB3xY9');
  });

  it('disables Create while it runs', async () => {
    const user = userEvent.setup();
    render(<Creating />);
    await user.type(screen.getByLabelText('Group name'), 'X');
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled();
  });

  it('says how to start without groups', () => {
    render(<NoGroups />);
    expect(screen.getByText(/not in any groups yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
});
