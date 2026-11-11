import { composeStories } from '@storybook/react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './spool-details-fields.stories';

const { Add, Edit, NoLocations } = composeStories(stories);

describe('SpoolDetailsFields', () => {
  it('heads the optional section when adding', () => {
    render(<Add />);
    expect(screen.getByRole('heading', { name: /Details/ })).toBeVisible();
    expect(screen.getByText('optional')).toBeVisible();
    expect(screen.queryByText(/NFC tag/)).toBeNull();
  });

  it('shows the values and the read-only NFC tag when editing', () => {
    render(<Edit />);
    expect(screen.queryByRole('heading', { name: /Details/ })).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Price paid (€)' })).toHaveValue(
      '19.99'
    );
    expect(screen.getByLabelText('Purchased')).toHaveValue('2026-03-14');
    expect(screen.getByLabelText('Last dried')).toHaveValue('2026-08-02');
    expect(screen.getByText('NFC tag · set via API')).toBeVisible();
    expect(screen.getByText('04:A2:3F:9B:61:80')).toBeVisible();
  });

  it('fills the location from a suggestion, leaving out the current one', async () => {
    const onChange = fn();
    render(<Edit onChange={onChange} locations={['A2', 'B1']} />);
    expect(screen.queryByRole('button', { name: 'A2' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'B1' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ location: 'B1', price: '19.99' })
    );
  });

  it('reports each field as typed', () => {
    const onChange = fn();
    render(<NoLocations onChange={onChange} />);
    expect(
      screen.queryByRole('group', { name: 'Location suggestions' })
    ).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: 'Price paid (€)' }), {
      target: { value: '22,90' },
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ price: '22,90' })
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Location' }), {
      target: { value: 'Shelf' },
    });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ location: 'Shelf' })
    );
  });
});
