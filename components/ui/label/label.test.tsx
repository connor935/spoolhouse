import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as stories from './label.stories';

const { Default } = composeStories(stories);

describe('Label', () => {
  it('labels its control and focuses it on click', async () => {
    render(<Default />);
    const input = screen.getByLabelText('Display name');
    await userEvent.click(screen.getByText('Display name'));
    expect(input).toHaveFocus();
  });
});
