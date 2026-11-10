import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as stories from './tooltip.stories';

const { Default, CollapsedRail } = composeStories(stories);

describe('Tooltip', () => {
  it('is closed until the trigger is hovered', async () => {
    render(<Default />);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    await userEvent.hover(
      screen.getByRole('button', { name: 'Notifications' })
    );
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Notifications'
    );
  });

  it('opens when the trigger receives keyboard focus', async () => {
    render(<Default />);
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Notifications' })).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
  });

  it('labels each rail icon with its own tooltip', async () => {
    render(<CollapsedRail />);
    await userEvent.hover(screen.getByRole('button', { name: 'Catalog' }));
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Catalog');
  });
});
