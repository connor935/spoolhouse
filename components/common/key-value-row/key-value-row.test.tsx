import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import { Button } from '@/components/ui/button';
import * as stories from './key-value-row.stories';

const { Default, List } = composeStories(stories);

describe('KeyValueRow', () => {
  it('renders label, value and action in three columns', () => {
    const { container } = render(<Default />);
    const row = container.querySelector('[data-slot="key-value-row"]')!;
    expect(row.children).toHaveLength(3);
    expect(row.children[0]).toHaveTextContent('Density');
    expect(row.children[1]).toHaveTextContent('1.24 g/cm³');
  });

  it('wires the action', async () => {
    const onClick = fn();
    render(<Default action={<Button onClick={onClick}>Edit</Button>} />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('stacks into a list with per-row actions', () => {
    render(<List />);
    expect(
      screen.getByRole('button', { name: 'Verify Drying temp' })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Delete / })).toHaveLength(4);
    expect(screen.getByText('Unverified')).toBeInTheDocument();
  });
});
