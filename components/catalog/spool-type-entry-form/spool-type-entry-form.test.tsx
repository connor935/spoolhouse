import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';

import * as stories from './spool-type-entry-form.stories';

const { Request, AdminAdd, EditRejected } = composeStories(stories);

describe('SpoolTypeEntryForm', () => {
  it('requests a spool type with a rounded gram weight', async () => {
    const onSubmit = fn();
    render(<Request onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Manufacturer'), 'Extrudr');
    await userEvent.type(screen.getByLabelText('Spool name'), 'Cardboard');
    await userEvent.type(
      screen.getByLabelText('Empty spool weight (g)'),
      '215,6'
    );
    await userEvent.click(screen.getByRole('button', { name: 'Request' }));
    expect(onSubmit).toHaveBeenCalledWith({
      manufacturer: 'Extrudr',
      name: 'Cardboard',
      emptyWeightGrams: 216,
    });
  });

  it('refuses a zero weight with the board message', async () => {
    const onSubmit = fn();
    render(<AdminAdd onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Empty spool weight (g)'), '0');
    await userEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onSubmit).not.toHaveBeenCalled();
    const input = screen.getByLabelText('Empty spool weight (g)');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Must be greater than 0 g.');
    expect(
      screen.getByText(/added to the global catalog straight away/)
    ).toBeVisible();
  });

  it('resubmits an own rejected entry', () => {
    render(<EditRejected />);
    expect(screen.getByLabelText('Empty spool weight (g)')).toHaveValue('330');
    expect(
      screen.getByRole('button', { name: 'Save & resubmit' })
    ).toBeVisible();
    expect(screen.getByText(/resubmits it for review/)).toBeVisible();
  });
});
