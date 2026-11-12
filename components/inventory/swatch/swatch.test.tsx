import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DEFAULT_MATERIAL_COLOR } from '@/lib/filament';
import * as stories from './swatch.stories';

const { Default, NoColor, Decorative } = composeStories(stories);

describe('Swatch', () => {
  it('is an image named after the colour', () => {
    render(<Default />);
    const swatch = screen.getByRole('img', { name: 'Galaxy Black' });
    expect(swatch).toHaveStyle({ backgroundColor: '#22242A' });
  });

  it('falls back to the default colour and names the hex', () => {
    render(<NoColor />);
    expect(
      screen.getByRole('img', { name: `Colour ${DEFAULT_MATERIAL_COLOR}` })
    ).toHaveStyle({ backgroundColor: DEFAULT_MATERIAL_COLOR });
  });

  it('can be hidden from assistive tech', () => {
    render(<Decorative />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
