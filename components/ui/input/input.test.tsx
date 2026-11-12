import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './input.stories';

const {
  Default,
  Numeric,
  Invalid,
  Disabled,
  Focused,
  WithUnit,
  WithUnitDisabled,
} = composeStories(stories);
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

  it('renders numeric inputs as right-aligned mono spinbuttons', () => {
    render(<Numeric />);
    const input = screen.getByRole('spinbutton', { name: label });
    expect(input).toHaveValue(935);
    expect(input).toHaveClass('text-right', 'font-mono');
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

  it('focuses in the focus story', async () => {
    const { container } = render(<Focused />);
    await Focused.play?.({ canvasElement: container });
    expect(screen.getByRole('textbox')).toHaveFocus();
  });
});

describe('InputGroup', () => {
  it('keeps the unit out of the accessible name', () => {
    render(<WithUnit />);
    expect(screen.getByRole('textbox', { name: label })).toHaveValue('1193');
  });

  it('focuses the input when the unit is clicked', async () => {
    render(<WithUnit />);
    await userEvent.click(screen.getByText('g'));
    expect(screen.getByRole('textbox', { name: label })).toHaveFocus();
  });

  it('accepts typed numbers', async () => {
    const onChange = fn();
    render(<WithUnit onChange={onChange} />);
    const input = screen.getByRole('textbox', { name: label });
    await userEvent.clear(input);
    await userEvent.type(input, '742');
    expect(input).toHaveValue('742');
    expect(onChange).toHaveBeenCalled();
  });

  it('does not focus a disabled input', async () => {
    render(<WithUnitDisabled />);
    await userEvent.click(screen.getByText('g'));
    expect(screen.getByRole('textbox', { name: label })).not.toHaveFocus();
  });
});
