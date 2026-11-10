import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import { Badge } from './badge';
import * as stories from './badge.stories';

const { Default, AsLink, Clickable, AllVariants } = composeStories(stories);

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

  it('works as a clickable tag when rendered as a button', async () => {
    const onClick = fn();
    render(<Clickable render={<button type="button" onClick={onClick} />} />);
    await userEvent.click(screen.getByRole('button', { name: 'Dry?' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applies distinct classes per tag variant', () => {
    render(<AllVariants />);
    const classNames = [
      'default',
      'muted',
      'accent',
      'accent-solid',
      'destructive',
      'destructive-outline',
      'inverted',
    ].map((variant) => screen.getByText(variant).className);
    expect(new Set(classNames).size).toBe(classNames.length);
  });

  it('maps legacy variant names onto tag variants', () => {
    render(
      <>
        <Badge>default</Badge>
        <Badge variant="outline">outline</Badge>
        <Badge variant="muted">muted</Badge>
        <Badge variant="secondary">secondary</Badge>
      </>
    );
    const cls = (text: string) => screen.getByText(text).className;
    expect(cls('outline')).toBe(cls('default'));
    expect(cls('secondary')).toBe(cls('muted'));
  });
});
