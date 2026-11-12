import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import * as stories from './group-card.stories';

const { Member, Owner, YourGroups } = composeStories(stories);

describe('GroupCard', () => {
  it('links the whole card to the group', () => {
    render(<Member />);
    expect(
      screen.getByRole('link', { name: 'Print Farm Friends' })
    ).toHaveAttribute('href', '/groups/group-farm');
  });

  it('shows your role, members and counts', () => {
    render(<Member />);
    expect(screen.getByText('Member')).toBeInTheDocument();
    const members = screen.getByRole('list', {
      name: 'Members of Print Farm Friends',
    });
    expect(within(members).getAllByRole('listitem')).toHaveLength(5);
    const term = (label: string) =>
      screen.getByText(label, { selector: 'dt' }).nextElementSibling;
    expect(term('Members')).toHaveTextContent('5');
    expect(term('Shared spools')).toHaveTextContent('23');
    expect(term('You share')).toHaveTextContent('6');
  });

  it('marks the owner and collapses long member lists', () => {
    render(<Owner />);
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('and 8 more')).toBeInTheDocument();
    expect(
      screen.getByText('Members', { selector: 'dt' }).nextElementSibling
    ).toHaveTextContent('12');
  });

  it('composes the Groups 01 section', () => {
    render(<YourGroups />);
    expect(
      screen.getByRole('heading', { name: 'Your groups' })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });
});
