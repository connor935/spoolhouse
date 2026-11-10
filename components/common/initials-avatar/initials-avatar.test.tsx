import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { initials } from './initials-avatar';
import * as stories from './initials-avatar.stories';

const { Default, You } = composeStories(stories);

describe('initials', () => {
  it.each([
    ['Felix Kratz', 'FK'],
    ['  anna  weber ', 'AW'],
    ['Jean-Luc Picard', 'JP'],
    ['Anna Maria Weber', 'AW'],
    ['anna', 'AN'],
    ['', '?'],
  ])('%j → %s', (name, expected) => {
    expect(initials(name)).toBe(expected);
  });
});

describe('InitialsAvatar', () => {
  it('shows initials and exposes the full name', () => {
    render(<Default />);
    expect(screen.getByText('AW')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Anna Weber')).toHaveClass('sr-only');
    expect(screen.getByTitle('Anna Weber')).toBeInTheDocument();
  });

  it('inverts for the signed-in user', () => {
    render(
      <>
        <Default />
        <You />
      </>
    );
    expect(screen.getByTitle('Felix Kratz').className).not.toBe(
      screen.getByTitle('Anna Weber').className
    );
  });
});
