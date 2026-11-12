import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Inset } from './inset';
import * as stories from './inset.stories';

const { Default } = composeStories(stories);

describe('Inset', () => {
  it('renders its content', () => {
    render(<Default />);
    expect(screen.getByLabelText('Location')).toBeInTheDocument();
  });

  it('passes through div props and merges classes', () => {
    render(
      <Inset aria-label="Spool details" className="gap-5">
        x
      </Inset>
    );
    const inset = screen.getByLabelText('Spool details');
    expect(inset.className).toContain('gap-5');
    expect(inset.className).not.toContain('gap-3');
    expect(inset.className).toContain('border-dashed');
  });
});
