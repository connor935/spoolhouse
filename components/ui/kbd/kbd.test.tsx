import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as stories from './kbd.stories';

const { Default, InButtons } = composeStories(stories);

describe('Kbd', () => {
  it('renders the key in a <kbd> element', () => {
    render(<Default />);
    const kbd = screen.getByText('N');
    expect(kbd.tagName).toBe('KBD');
    expect(kbd).toHaveAttribute('data-slot', 'kbd');
  });

  it('sits inside buttons without changing their accessible name', () => {
    render(<InButtons />);
    const buttons = screen.getAllByRole('button', { name: 'Add spool' });
    expect(buttons).toHaveLength(4);
    for (const button of buttons) {
      expect(button.querySelector('[data-slot="kbd"]')).toHaveTextContent('N');
    }
  });
});
