import { composeStories } from '@storybook/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './spool-weight-fields.stories';

const { Add, NoSpoolType, Edit, Unreadable } = composeStories(stories);

const left = () => screen.queryByTestId('calculated-left');

describe('SpoolWeightFields', () => {
  it('shows filament left as total minus the empty spool', () => {
    render(<Edit />);
    expect(left()).toHaveTextContent('742');
    expect(screen.getByText('935 g total − 193 g empty spool')).toBeVisible();
    expect(
      screen.getByText('Put the whole spool on a scale and enter the value.')
    ).toBeVisible();
    expect(screen.queryByText(/Filament on a new spool/)).toBeNull();
  });

  it('explains the prefilled total when adding', () => {
    render(<Add />);
    expect(left()).toHaveTextContent('1.00');
    expect(screen.getByText(/Prefilled for a fresh spool/)).toBeVisible();
  });

  it('shows a dash until a spool type is picked or the total is readable', () => {
    const { unmount } = render(<NoSpoolType />);
    expect(left()).toBeNull();
    expect(screen.getByText('—')).toBeVisible();
    unmount();
    render(<Unreadable />);
    expect(left()).toBeNull();
  });

  it('reports raw input changes', () => {
    const onFullGramsChange = fn();
    const onMeasuredGramsChange = fn();
    render(
      <Add
        onFullGramsChange={onFullGramsChange}
        onMeasuredGramsChange={onMeasuredGramsChange}
      />
    );
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Full filament weight (g)' }),
      { target: { value: '750' } }
    );
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Measured total weight (g)' }),
      { target: { value: '900' } }
    );
    expect(onFullGramsChange).toHaveBeenCalledWith('750');
    expect(onMeasuredGramsChange).toHaveBeenCalledWith('900');
  });
});
