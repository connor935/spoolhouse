import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as stories from './meter.stories';

const { Default, Low, Overfull } = composeStories(stories);
const name = 'Spool #01 filament left';

describe('Meter', () => {
  it('exposes its value as a meter', () => {
    render(<Default />);
    const meter = screen.getByRole('meter', { name });
    expect(meter).toHaveAttribute('aria-valuenow', '74');
    expect(meter).toHaveAttribute('aria-valuemin', '0');
    expect(meter).toHaveAttribute('aria-valuemax', '100');
  });

  it('clamps values above 100', () => {
    render(<Overfull />);
    expect(screen.getByRole('meter', { name })).toHaveAttribute(
      'aria-valuenow',
      '100'
    );
  });

  it('marks the low tone', () => {
    render(<Low />);
    const meter = screen.getByRole('meter', { name });
    expect(meter).toHaveAttribute('data-tone', 'low');
    expect(meter).toHaveAttribute('aria-valuenow', '9');
  });
});
