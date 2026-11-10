import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './field.stories';

const {
  Default,
  WithUnit,
  RequiredWithAction,
  Invalid,
  Disabled,
  FormExample,
} = composeStories(stories);

describe('Field', () => {
  it('labels the control and describes it with the help text', () => {
    render(<Default />);
    const input = screen.getByLabelText('Location');
    expect(input).toHaveAccessibleDescription('Shelf, box or AMS slot.');
  });

  it('labels a unit input without the unit', async () => {
    render(<WithUnit />);
    const input = screen.getByRole('textbox', {
      name: 'Full filament weight (g)',
    });
    await userEvent.clear(input);
    await userEvent.type(input, '750');
    expect(input).toHaveValue('750');
  });

  it('keeps the required marker and action out of the label', async () => {
    const onRequestNew = fn();
    render(<RequiredWithAction onRequestNew={onRequestNew} />);
    const input = screen.getByRole('textbox', { name: 'Spool type' });
    expect(input).toBeRequired();
    await userEvent.click(
      screen.getByRole('button', { name: '+ Request new' })
    );
    expect(onRequestNew).toHaveBeenCalledOnce();
  });

  it('marks the control invalid and links the error message', () => {
    render(<Invalid />);
    const input = screen.getByRole('textbox', {
      name: 'Measured total weight (g)',
    });
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription(
      expect.stringContaining('Enter a weight of 0 g or more.')
    );
  });

  it('hides the error message while valid', () => {
    render(<Default />);
    expect(screen.queryByText(/Enter a weight/)).not.toBeInTheDocument();
  });

  it('disables the control', () => {
    render(<Disabled />);
    expect(screen.getByLabelText('Email')).toBeDisabled();
  });

  it('renders the add-spool form with every field labelled', () => {
    render(<FormExample />);
    for (const name of [
      'Full filament weight (g)',
      'Measured total weight (g)',
      'Price paid (€)',
      'Location',
    ]) {
      expect(screen.getByRole('textbox', { name })).toBeInTheDocument();
    }
    expect(screen.getByLabelText('Purchased')).toHaveValue('2026-11-10');
    expect(
      screen.getByRole('combobox', { name: 'Material' })
    ).toHaveTextContent('Prusament · Galaxy Black · PLA');
    expect(screen.getByRole('combobox', { name: 'Spool type' })).toBeInvalid();
  });
});
