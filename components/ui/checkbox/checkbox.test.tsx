import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './checkbox.stories';

const { Unchecked, Checked, Indeterminate, Disabled } = composeStories(stories);
const name = 'Hide lent spools';

describe('Checkbox', () => {
  it('toggles from its label and reports the new state', async () => {
    const onCheckedChange = fn();
    render(<Unchecked onCheckedChange={onCheckedChange} />);
    const checkbox = screen.getByRole('checkbox', { name });
    expect(checkbox).not.toBeChecked();

    await userEvent.click(screen.getByText(name));
    expect(checkbox).toBeChecked();
    expect(onCheckedChange).toHaveBeenLastCalledWith(true, expect.anything());

    await userEvent.keyboard(' ');
    expect(checkbox).not.toBeChecked();
  });

  it('starts checked', () => {
    render(<Checked />);
    expect(screen.getByRole('checkbox', { name })).toBeChecked();
  });

  it('reports the mixed state', () => {
    render(<Indeterminate />);
    expect(screen.getByRole('checkbox', { name })).toBePartiallyChecked();
  });

  it('ignores clicks while disabled', async () => {
    const onCheckedChange = fn();
    render(<Disabled onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByRole('checkbox', { name }));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
