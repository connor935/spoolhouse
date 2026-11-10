import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './combobox-list.stories';

const { MaterialPicker, Empty, StaticList } = composeStories(stories);

function highlighted() {
  return screen
    .getAllByRole('option')
    .filter((o) => o.getAttribute('aria-selected') === 'true');
}

describe('ComboboxList', () => {
  it('highlights rows with the arrow keys and selects with Enter', async () => {
    const onSelect = fn();
    render(<MaterialPicker onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Material' }));

    expect(screen.getByRole('listbox', { name: 'Materials' })).toBeVisible();
    expect(highlighted()).toHaveLength(1);
    expect(highlighted()[0]).toHaveTextContent('Galaxy BlackPLA');

    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(highlighted()).toHaveLength(1);
    expect(highlighted()[0]).toHaveTextContent('Galaxy Purple');
    expect(highlighted()[0]).toHaveAttribute('data-active');

    await userEvent.keyboard('{ArrowUp}');
    expect(highlighted()[0]).toHaveTextContent('Galaxy BlackPETG');

    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: '2' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('filters as you type and shows the cap note', async () => {
    render(<MaterialPicker />);
    await userEvent.type(
      screen.getByRole('combobox', { name: 'Material' }),
      'sunlu'
    );
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByText('max. 50 shown')).toBeVisible();
  });

  it('shows the empty message when nothing matches', async () => {
    render(<Empty />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Material' }));
    expect(screen.getByText('No materials match.')).toBeVisible();
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('marks only the active option in a static list', () => {
    render(<StaticList />);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(5);
    expect(highlighted()).toEqual([options[0]]);
  });
});
