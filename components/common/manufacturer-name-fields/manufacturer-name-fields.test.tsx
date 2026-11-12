import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './manufacturer-name-fields.stories';

const { Stacked, InlineGrid } = composeStories(stories);

describe('ManufacturerNameFields', () => {
  it('labels both inputs and marks them required', () => {
    render(<Stacked />);
    const manufacturer = screen.getByLabelText('Manufacturer');
    const name = screen.getByLabelText('Name');
    expect(manufacturer).toHaveAttribute('id', 'story-manufacturer');
    expect(name).toHaveAttribute('id', 'story-name');
    expect(manufacturer).toBeRequired();
    expect(name).toBeRequired();
    expect(manufacturer).toHaveAttribute('placeholder', 'e.g. Prusament');
  });

  it('reports each field separately', async () => {
    const onManufacturerChange = fn();
    const onNameChange = fn();
    render(
      <Stacked
        onManufacturerChange={onManufacturerChange}
        onNameChange={onNameChange}
      />
    );
    await userEvent.type(screen.getByLabelText('Manufacturer'), 'Sunlu');
    await userEvent.type(screen.getByLabelText('Name'), 'Red');
    expect(onManufacturerChange).toHaveBeenLastCalledWith('Sunlu');
    expect(onNameChange).toHaveBeenLastCalledWith('Red');
  });

  it('renders the compact grid with a custom name label', () => {
    const { container } = render(<InlineGrid />);
    expect(container.querySelector('.grid-cols-2')).not.toBeNull();
    expect(screen.getByLabelText('Spool name')).toHaveValue('Cardboard 1 kg');
    expect(screen.getByLabelText('Manufacturer')).toHaveClass('h-8');
    expect(screen.getByLabelText('Manufacturer')).not.toBeRequired();
  });
});
