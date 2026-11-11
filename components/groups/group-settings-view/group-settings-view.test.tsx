import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { whitelistIds } from '@/stories/fixtures/social';
import * as stories from './group-settings-view.stories';

const { Owner, OwnerDeleteBlocked, Member, MemberLeaveBlocked } =
  composeStories(stories);

describe('GroupSettingsView', () => {
  it('saves the sharing mode and list', async () => {
    const user = userEvent.setup();
    render(<Owner />);
    await user.click(
      screen.getByRole('button', { name: 'Save sharing settings' })
    );
    expect(Owner.args.onSaveSharing).toHaveBeenCalledWith(
      'whitelist',
      whitelistIds
    );
  });

  it('renames only to a new, non-empty name', async () => {
    const user = userEvent.setup();
    render(<Owner />);
    const rename = screen.getByRole('button', { name: 'Rename' });
    expect(rename).toBeDisabled();
    const input = screen.getByLabelText('Name');
    await user.clear(input);
    await user.type(input, '  Kiel Makers ');
    await user.click(rename);
    expect(Owner.args.onRename).toHaveBeenCalledWith('Kiel Makers');
  });

  it('lets the owner remove members, except one with an active lend', async () => {
    const user = userEvent.setup();
    render(<Owner />);
    expect(
      screen.queryByRole('button', { name: /remove felix/i })
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /remove lena/i }));
    expect(Owner.args.onRemove).toHaveBeenCalledWith('user-lena');
    // aria-disabled (still focusable, so the reason stays reachable)
    const paul = screen.getByRole('button', { name: /remove paul/i });
    expect(paul).toHaveAttribute('aria-disabled', 'true');
    await user.click(paul);
    expect(Owner.args.onRemove).not.toHaveBeenCalledWith('user-paul');
  });

  it('deletes, or explains why it cannot', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Owner />);
    await user.click(screen.getByRole('button', { name: 'Delete group' }));
    expect(Owner.args.onDelete).toHaveBeenCalled();
    unmount();

    render(<OwnerDeleteBlocked />);
    expect(screen.getByRole('button', { name: 'Delete group' })).toBeDisabled();
    expect(
      screen.getByText(/mark its active lends returned first/i)
    ).toBeInTheDocument();
  });

  it('members see sharing and leave, no owner tools', async () => {
    const user = userEvent.setup();
    render(<Member />);
    expect(
      screen.queryByRole('button', { name: 'Rename' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Delete group' })
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Leave group' }));
    expect(Member.args.onLeave).toHaveBeenCalled();
  });

  it('leaving is blocked while your lend is active', () => {
    render(<MemberLeaveBlocked />);
    expect(screen.getByRole('button', { name: 'Leave group' })).toBeDisabled();
    expect(screen.getByText(/can’t leave/i)).toBeInTheDocument();
  });
});
