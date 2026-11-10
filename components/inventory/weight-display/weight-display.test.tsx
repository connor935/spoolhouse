import { composeStories } from '@storybook/react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as stories from './weight-display.stories';

const { Tile, Kilograms } = composeStories(stories);

describe('WeightDisplay', () => {
  it('shows grams below 1 kg with a separate unit', () => {
    const { container } = render(<Tile />);
    const weight = container.querySelector('[data-slot="weight-display"]');
    expect(weight).toHaveTextContent('742 g');
    expect(weight?.querySelector('small')).toHaveTextContent('g');
  });

  it('switches to kilograms like formatWeight', () => {
    const { container } = render(<Kilograms />);
    expect(
      container.querySelector('[data-slot="weight-display"]')
    ).toHaveTextContent('2.16 kg');
  });
});
