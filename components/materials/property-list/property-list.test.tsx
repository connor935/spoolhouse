import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';

import * as stories from './property-list.stories';

const { Member, Admin, Empty, Complete, Pending } = composeStories(stories);

describe('PropertyList', () => {
  it('lists values with units and tags member edits as unverified', () => {
    render(<Member />);
    expect(screen.getByText('1.24')).toBeInTheDocument();
    expect(screen.getAllByText('Unverified')).toHaveLength(2);
    expect(
      screen.getAllByText('Added by Anna Weber — not yet verified')
    ).toHaveLength(2);
  });

  it('gives members edit but not verify or delete', () => {
    render(<Member />);
    expect(screen.getByRole('button', { name: 'Edit Density' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /^Verify / })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Delete / })).toBeNull();
  });

  it('gives admins verify on unverified values and delete on all', async () => {
    const onVerify = fn();
    const onDelete = fn();
    render(<Admin onVerify={onVerify} onDelete={onDelete} />);
    expect(screen.getAllByRole('button', { name: /^Verify / })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /^Delete / })).toHaveLength(6);
    await userEvent.click(
      screen.getByRole('button', { name: 'Verify Drying temp' })
    );
    expect(onVerify).toHaveBeenCalledWith(
      expect.objectContaining({ propertyId: 'prop-drying' })
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Delete Density' })
    );
    expect(onDelete).toHaveBeenCalledWith(
      expect.objectContaining({ propertyId: 'prop-density' })
    );
  });

  it('edits a value in place and closes on success', async () => {
    const onSave = fn(() => true);
    render(<Member onSave={onSave} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Edit Bed temp' })
    );
    const input = screen.getByRole('textbox', { name: 'Bed temp value' });
    await userEvent.clear(input);
    await userEvent.type(input, '65{Enter}');
    expect(onSave).toHaveBeenCalledWith('prop-bed', '65');
    expect(
      screen.queryByRole('textbox', { name: 'Bed temp value' })
    ).toBeNull();
  });

  it('keeps the editor open when the save fails', async () => {
    render(<Member onSave={fn(() => false)} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Edit Bed temp' })
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Save Bed temp' })
    );
    expect(
      screen.getByRole('textbox', { name: 'Bed temp value' })
    ).toBeVisible();
  });

  it('rejects a value that does not fit the type before saving', async () => {
    const onSave = fn(() => true);
    render(<Member onSave={onSave} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Edit Drying temp' })
    );
    const input = screen.getByRole('textbox', { name: 'Drying temp value' });
    await userEvent.clear(input);
    await userEvent.type(input, 'hot{Enter}');
    expect(onSave).not.toHaveBeenCalled();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(/.+/);
  });

  it('cancels an edit with Escape', async () => {
    render(<Member />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit Density' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('textbox', { name: 'Density value' })).toBeNull();
  });

  it('adds a property from the unused definitions with a type hint', async () => {
    const onSave = fn(() => true);
    render(<Member onSave={onSave} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add property' }));
    const form = screen.getByRole('form', { name: 'Add property' });
    expect(within(form).getByText('A whole number, e.g. 220')).toBeVisible();
    await userEvent.type(within(form).getByLabelText('Value'), '60');
    await userEvent.click(within(form).getByRole('button', { name: 'Add' }));
    expect(onSave).toHaveBeenCalledWith('prop-tg', '60');
    expect(screen.queryByRole('form', { name: 'Add property' })).toBeNull();
  });

  it('offers no add when every definition has a value', () => {
    render(<Complete />);
    expect(screen.queryByRole('button', { name: 'Add property' })).toBeNull();
  });

  it('explains an empty datasheet', () => {
    render(<Empty />);
    expect(screen.getByText(/No datasheet values yet/)).toBeVisible();
  });

  it('disables actions while pending', () => {
    render(<Pending />);
    expect(screen.getByRole('button', { name: 'Edit Density' })).toBeDisabled();
  });
});
