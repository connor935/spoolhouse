import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as stories from './section-header.stories';

const { Default, WithLink, WithoutNumber } = composeStories(stories);

describe('SectionHeader', () => {
  it('renders the label as an h2 with its number', () => {
    render(<Default id="low" />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('Running low');
    expect(heading).toHaveAttribute('id', 'low');
    expect(screen.getByText('02')).toBeInTheDocument();
  });

  it('renders the aside slot', () => {
    render(<WithLink />);
    expect(screen.getByRole('link', { name: 'Inventory →' })).toHaveAttribute(
      'href',
      '/inventory'
    );
  });

  it('omits the number when none is given', () => {
    const { container } = render(<WithoutNumber />);
    expect(container.querySelector('.text-accent')).toBeNull();
  });
});
