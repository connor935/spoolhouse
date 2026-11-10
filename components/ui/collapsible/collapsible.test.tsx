import { composeStories } from '@storybook/react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as stories from './collapsible.stories';

const { Closed, Open } = composeStories(stories);

const content = 'Price paid, purchase date, location and last dried.';

describe('Collapsible', () => {
  it('reveals its content when the trigger is clicked', async () => {
    render(<Closed />);
    const trigger = screen.getByRole('button', { name: /details/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(content)).not.toBeInTheDocument();

    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(content)).toBeVisible();
  });

  it('collapses again from the open state', async () => {
    render(<Open />);
    const trigger = screen.getByRole('button', { name: /details/i });
    expect(screen.getByText(content)).toBeVisible();
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() =>
      expect(screen.queryByText(content)).not.toBeInTheDocument()
    );
  });
});
