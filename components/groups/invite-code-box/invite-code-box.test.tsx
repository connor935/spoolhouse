import { composeStories } from '@storybook/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as stories from './invite-code-box.stories';

const { Owner, Member, Rotating, InviteSection } = composeStories(stories);

const LINK = 'https://spoolhouse.example.org/groups/join/aB3xY9';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('InviteCodeBox', () => {
  it('shows the code and the full link', () => {
    render(<Owner />);
    expect(screen.getByText('aB3xY9')).toBeInTheDocument();
    expect(screen.getByText(LINK)).toBeInTheDocument();
  });

  it('copies the link and says so for a moment', async () => {
    // setup() installs user-event's clipboard stub; spy on it afterwards.
    const user = userEvent.setup();
    const writeText = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue(undefined);
    const onCopied = fn();
    render(<Owner onCopied={onCopied} />);

    await user.click(screen.getByRole('button', { name: 'Copy link' }));
    expect(writeText).toHaveBeenCalledWith(LINK);
    expect(onCopied).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Invite link copied');

    await waitFor(
      () =>
        expect(
          screen.getByRole('button', { name: 'Copy link' })
        ).toBeInTheDocument(),
      { timeout: 3000 }
    );
  });

  it('reports a refused clipboard instead of claiming success', async () => {
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
      new Error('denied')
    );
    const onCopied = fn();
    const onCopyError = fn();
    render(<Owner onCopied={onCopied} onCopyError={onCopyError} />);

    await user.click(screen.getByRole('button', { name: 'Copy link' }));
    await waitFor(() => expect(onCopyError).toHaveBeenCalledOnce());
    expect(onCopied).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Copy link' })
    ).toBeInTheDocument();
  });

  it('rotates only after confirming', async () => {
    const user = userEvent.setup();
    const onRotate = fn();
    render(<Owner onRotate={onRotate} />);

    await user.click(
      screen.getByRole('button', { name: 'Rotate invite code' })
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Rotate invite code?',
    });
    expect(dialog).toHaveTextContent('stop working right away');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onRotate).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole('button', { name: 'Rotate invite code' })
    );
    await user.click(await screen.findByRole('button', { name: 'Rotate' }));
    expect(onRotate).toHaveBeenCalledOnce();
  });

  it('has no Rotate for members', () => {
    render(<Member />);
    expect(
      screen.queryByRole('button', { name: /Rotate/ })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Copy link' })
    ).toBeInTheDocument();
  });

  it('disables Rotate while it runs', () => {
    render(<Rotating />);
    expect(screen.getByRole('button', { name: 'Rotating…' })).toBeDisabled();
  });

  it('composes the GroupSettings 03 section', () => {
    render(<InviteSection />);
    expect(
      screen.getByRole('heading', { name: 'Invite link' })
    ).toBeInTheDocument();
  });
});
