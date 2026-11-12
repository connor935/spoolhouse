import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import * as stories from './lend-line.stories';

const { LentOut, LentOutJustNow, Borrowed, Sections } = composeStories(stories);

function line() {
  return document.querySelector('[data-slot="lend-line"]') as HTMLElement;
}

describe('LendLine', () => {
  it('shows an outgoing lend with usage so far and the owner action', () => {
    render(<LentOut />);
    expect(line()).toHaveAttribute('data-direction', 'out');
    expect(screen.getByText('Out')).toBeInTheDocument();
    expect(line()).toHaveTextContent('#02 Galaxy Black');
    expect(line()).toHaveTextContent('lent to Jonas Brandt');
    expect(line()).toHaveTextContent('since 12 Oct · −58 g so far');
    expect(
      screen.getByRole('button', { name: 'Mark returned' })
    ).toBeInTheDocument();
    expect(screen.queryByRole('meter')).not.toBeInTheDocument();
  });

  it('leaves out "so far" until something was used', () => {
    render(<LentOutJustNow />);
    expect(line()).toHaveTextContent('since 10 Nov');
    expect(line()).not.toHaveTextContent('so far');
  });

  it('shows a borrowed spool with meter, weight and who ends the lend', () => {
    render(<Borrowed />);
    expect(screen.getByText('In')).toBeInTheDocument();
    expect(line()).toHaveTextContent('borrowed from Mia Koch');
    expect(line()).toHaveTextContent(
      'since 07 Nov · Print Farm Friends · only Mia can end the lend'
    );
    expect(
      screen.getByRole('meter', { name: '#04 Basic Cyan filament left' })
    ).toHaveAttribute('aria-valuenow', '32');
    expect(line()).toHaveTextContent('318 g');
    expect(screen.getByRole('button', { name: 'Weigh' })).toBeInTheDocument();
  });

  it('composes the Borrows 03 + 04 sections', () => {
    render(<Sections />);
    expect(
      screen.getByRole('heading', { name: 'Lent out' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Borrowed by you' })
    ).toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="lend-line"]')).toHaveLength(
      2
    );
  });
});
