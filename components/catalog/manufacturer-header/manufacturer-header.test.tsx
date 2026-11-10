import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as stories from './manufacturer-header.stories';

const { Default, LargeCount, WithoutCount } = composeStories(stories);

describe('ManufacturerHeader', () => {
  it('heads the group with the manufacturer name', () => {
    render(<Default />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Prusament' })
    ).toBeInTheDocument();
    expect(screen.getByText('96')).toBeInTheDocument();
  });

  it('formats large counts and supports other heading levels', () => {
    render(<LargeCount level={3} />);
    expect(
      screen.getByRole('heading', { level: 3, name: 'Bambu Lab' })
    ).toBeInTheDocument();
    expect(screen.getByText('2,140')).toBeInTheDocument();
  });

  it('omits the count when none is given', () => {
    const { container } = render(<WithoutCount />);
    expect(container.querySelector('.kicker')).toBeNull();
  });
});
