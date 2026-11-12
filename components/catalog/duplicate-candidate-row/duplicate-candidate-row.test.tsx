import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as stories from './duplicate-candidate-row.stories';

const { SameName, CloseColor, Similar, AsLink, List } = composeStories(stories);

describe('DuplicateCandidateRow', () => {
  it.each([
    ['same name', SameName, 'Same name', 'PETG · approved · 4 spools'],
    ['close color', CloseColor, 'Close color', 'PLA · approved · ΔE 1.8'],
    ['similar', Similar, 'Similar', 'PLA · approved · ΔE 6.4'],
  ])('tags a %s candidate', (_, Story, tag, meta) => {
    render(<Story />);
    expect(screen.getByText(tag)).toBeInTheDocument();
    expect(screen.getByText(meta)).toBeInTheDocument();
  });

  it('reads as manufacturer · name', () => {
    render(<CloseColor />);
    expect(screen.getByText('Sunlu ·').parentElement).toHaveTextContent(
      'Sunlu · Galaxy Dark Blue'
    );
  });

  it('links to the candidate when given an href', () => {
    render(<AsLink />);
    expect(
      screen.getByRole('link', { name: 'Sunlu · Galaxy Blue' })
    ).toHaveAttribute('href', '#materials/dup-galaxy-blue-petg');
  });

  it('stacks into the possible-duplicates list', () => {
    const { container } = render(<List />);
    expect(
      container.querySelectorAll('[data-slot="duplicate-candidate-row"]')
    ).toHaveLength(3);
  });
});
