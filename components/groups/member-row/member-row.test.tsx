import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';

import * as stories from './member-row.stories';

const { Removable, RemoveBlocked, You, ReadOnly, MembersSection } =
  composeStories(stories);

describe('MemberRow', () => {
  it('shows name and meta, and removes on click', async () => {
    const onRemove = fn();
    render(<Removable onRemove={onRemove} />);
    const row = screen.getByRole('listitem');
    expect(row).toHaveTextContent('Lena Schulz');
    expect(row).toHaveTextContent('joined Mar 2026 · shares 9');
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove Lena Schulz' })
    );
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it('refuses removal with a reason while a lend is active', async () => {
    const onRemove = fn();
    render(<RemoveBlocked onRemove={onRemove} />);
    const button = screen.getByRole('button', { name: 'Remove Paul Neumann' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('title', 'Mark active lends returned first');
    await userEvent.click(button);
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('marks yourself and the owner, without Remove', () => {
    render(<You />);
    expect(screen.getByText('you')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('has no Remove for non-owners', () => {
    render(<ReadOnly />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('composes the GroupSettings 04 section', () => {
    render(<MembersSection />);
    expect(
      screen.getByRole('heading', { name: 'Members' })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getAllByRole('button', { name: /^Remove/ })).toHaveLength(2);
  });
});
