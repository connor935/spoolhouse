import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './input.stories';

const { Default, Numeric, Invalid, Disabled } = composeStories(stories);
const label = 'Measured total weight (g)';

describe('Input', () => {
  it('accepts typed text and reports changes', async () => {
    const onChange = fn();
    render(<Default onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: label });
    await userEvent.type(input, '742');
    expect(input).toHaveValue('742');
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it('renders numeric inputs as spinbuttons with their value', () => {
    render(<Numeric />);
    expect(screen.getByRole('spinbutton', { name: label })).toHaveValue(935);
  });

  it('exposes the invalid state to assistive tech', () => {
    render(<Invalid />);
    expect(screen.getByRole('textbox', { name: label })).toBeInvalid();
  });

  it('ignores typing while disabled', async () => {
    render(<Disabled />);
    const input = screen.getByRole('textbox', { name: label });
    expect(input).toBeDisabled();
    await userEvent.type(input, '1');
    expect(input).toHaveValue('193');
  });
});
