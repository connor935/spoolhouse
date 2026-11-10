import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import { Button } from '@/components/ui/button';
import * as stories from './empty-state.stories';

const { Default, Onboarding } = composeStories(stories);

describe('EmptyState', () => {
  it('renders kicker, text and a working action', async () => {
    const onClick = fn();
    render(<Default action={<Button onClick={onClick}>Clear filters</Button>} />);
    expect(screen.getByText('Inventory')).toBeInTheDocument();
    expect(screen.getByText('No spools match these filters.')).toBeInTheDocument();
    // The plain variant is a message, not a heading.
    expect(screen.queryByRole('heading')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('onboarding: display h2 and numbered steps', () => {
    render(<Onboarding />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'Your shelf is empty' })
    ).toBeInTheDocument();
    const steps = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(steps.map((s) => s.textContent)).toEqual([
      '01 Pick a material from the catalog',
      '02 Weigh the full spool',
      '03 Re-weigh after printing',
    ]);
  });
});
