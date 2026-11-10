import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as stories from './result-box.stories';

const { Default, Progress } = composeStories(stories);

describe('ResultBox', () => {
  it('renders content as a live status region', () => {
    render(<Default />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Calculated filament left742 g'
    );
  });

  it('lets callers restack it', () => {
    render(<Progress />);
    expect(screen.getByRole('status').className).toContain('flex-col');
    expect(screen.getByRole('status').className).toContain('border-l-accent');
  });
});
