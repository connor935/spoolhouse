import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './select-field.stories';

const { Default, Wide } = composeStories(stories);

describe('SelectField', () => {
  it('shows the label of the current value', () => {
    render(<Default />);
    expect(screen.getByRole('combobox', { name: 'Sort by' })).toHaveTextContent(
      'Name'
    );
  });

  it('lists every item and reports the pick', async () => {
    const onValueChange = fn();
    render(<Default onValueChange={onValueChange} />);
    const trigger = screen.getByRole('combobox', { name: 'Sort by' });
    await userEvent.click(trigger);
    expect(await screen.findAllByRole('option')).toHaveLength(3);
    await userEvent.click(
      screen.getByRole('option', { name: 'Filament left' })
    );
    expect(onValueChange).toHaveBeenCalledWith('left');
    expect(trigger).toHaveTextContent('Filament left');
  });

  it('passes the trigger class through', () => {
    render(<Wide />);
    expect(screen.getByRole('combobox')).toHaveClass('w-56');
  });
});
