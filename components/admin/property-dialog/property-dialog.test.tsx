import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import * as stories from './property-dialog.stories';

const { Create, Edit, Refused, Saving } = composeStories(stories);

describe('PropertyDialog', () => {
  it('creates a definition with key, trimmed fields and the chosen type', async () => {
    const user = userEvent.setup();
    render(<Create />);
    expect(screen.getByRole('heading', { name: 'New property' })).toBeVisible();
    await user.type(screen.getByLabelText('Name'), ' Hardness ');
    await user.type(screen.getByLabelText('Key'), 'hardness');
    await user.type(screen.getByLabelText(/Unit/), 'Shore D');
    await user.click(screen.getByRole('button', { name: 'Integer' }));
    expect(screen.getByText('A whole number, e.g. 220')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Add property' }));

    expect(Create.args.onSubmit).toHaveBeenCalledWith({
      key: 'hardness',
      name: 'Hardness',
      unit: 'Shore D',
      description: null,
      valueType: 'integer',
    });
  });

  it('shows the key as fixed when editing', () => {
    render(<Edit />);
    expect(
      screen.getByRole('heading', { name: 'Edit property' })
    ).toBeVisible();
    const key = screen.getByLabelText(/Key/);
    expect(key).toHaveValue('extruder_temp');
    expect(key).toHaveAttribute('readonly');
  });

  it('warns that a type change re-checks the existing values', async () => {
    const user = userEvent.setup();
    render(<Edit />);
    expect(screen.queryByText(/re-checks all/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'List' }));
    expect(screen.getByText(/re-checks all 412 existing values/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Save property' }));
    expect(Edit.args.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ valueType: 'list', key: 'extruder_temp' })
    );
  });

  it('surfaces the server refusal as an alert', () => {
    render(<Refused />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      '3 existing values do not fit "list"'
    );
  });

  it('drops the refusal once another type is picked', async () => {
    const user = userEvent.setup();
    render(<Refused />);
    await user.click(screen.getByRole('button', { name: 'Range' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('disables saving while it runs', () => {
    render(<Saving />);
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });
});
