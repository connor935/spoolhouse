import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './select.stories';

const { Placeholder, WithValue, Invalid, Disabled } = composeStories(stories);

describe('Select', () => {
  it('shows the placeholder until a value is picked', async () => {
    const onValueChange = fn();
    render(<Placeholder onValueChange={onValueChange} />);
    const trigger = screen.getByRole('combobox', { name: 'Filament type' });
    expect(trigger).toHaveTextContent('All types');

    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole('option', { name: 'TPU' }));

    expect(onValueChange).toHaveBeenCalledWith('TPU', expect.anything());
    expect(trigger).toHaveTextContent('TPU');
  });

  it('renders the selected value', () => {
    render(<WithValue />);
    expect(screen.getByRole('combobox')).toHaveTextContent('PETG');
  });

  it('exposes the invalid state', () => {
    render(<Invalid />);
    expect(screen.getByRole('combobox')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
  });

  it('does not open while disabled', async () => {
    render(<Disabled />);
    await userEvent.click(screen.getByRole('combobox'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
