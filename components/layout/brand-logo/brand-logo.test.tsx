import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as stories from './brand-logo.stories';

const { Default, MarkOnly } = composeStories(stories);

describe('BrandLogo', () => {
  it('shows the word mark next to the decorative tile', () => {
    const { container } = render(<Default />);
    expect(screen.getByText('Spoolhouse')).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden]')).toHaveClass('bg-accent');
  });

  it('can render the mark alone', () => {
    render(<MarkOnly />);
    expect(screen.queryByText('Spoolhouse')).not.toBeInTheDocument();
  });
});
