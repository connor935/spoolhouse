import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as stories from './badge.stories';

const { Default, AsLink, AllVariants } = composeStories(stories);

describe('Badge', () => {
  it('renders its text in a span by default', () => {
    render(<Default />);
    const badge = screen.getByText('Low');
    expect(badge.tagName).toBe('SPAN');
  });

  it('renders as the element given via `render`, keeping its props', () => {
    render(<AsLink />);
    const link = screen.getByRole('link', { name: 'Pending review' });
    expect(link).toHaveAttribute('href', '/admin/materials?status=pending');
  });

  it('applies distinct classes per variant', () => {
    render(<AllVariants />);
    const classNames = [
      'default',
      'secondary',
      'destructive',
      'outline',
      'ghost',
      'link',
    ].map((variant) => screen.getByText(variant).className);
    expect(new Set(classNames).size).toBe(classNames.length);
  });
});
