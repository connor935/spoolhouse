import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as stories from './separator.stories';

const { Default, Ink, Vertical } = composeStories(stories);

describe('Separator', () => {
  it('renders a horizontal border-coloured separator by default', () => {
    render(<Default />);
    const separator = screen.getByRole('separator');
    expect(separator).toHaveAttribute('aria-orientation', 'horizontal');
    expect(separator).toHaveClass('bg-border');
  });

  it('uses the ink colour for the ink variant', () => {
    render(<Ink />);
    const separator = screen.getByRole('separator');
    expect(separator).toHaveClass('bg-ink');
    expect(separator).not.toHaveClass('bg-border');
  });

  it('supports vertical orientation', () => {
    render(<Vertical />);
    expect(screen.getByRole('separator')).toHaveAttribute(
      'aria-orientation',
      'vertical'
    );
  });
});
