import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './active-filter-chips.stories';

const { Default, Interactive, Empty } = composeStories(stories);

describe('ActiveFilterChips', () => {
  it('lists one chip per active filter', () => {
    render(<Default />);
    const group = screen.getByRole('group', { name: 'Active filters' });
    expect(group).toHaveTextContent('PLA');
    expect(group).toHaveTextContent('≥ 300 g left');
    expect(group).toHaveTextContent('Density 1.2–1.3 g/cm³');
  });

  it('reports the removed chip by id', async () => {
    const onRemove = fn();
    render(<Default onRemove={onRemove} />);
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Remove filter Density 1.2–1.3 g/cm³',
      })
    );
    expect(onRemove).toHaveBeenCalledWith('prop:prop-density');
  });

  it('drops the chip once its filter is removed', async () => {
    render(<Interactive />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Remove filter PETG' })
    );
    expect(
      screen.queryByRole('button', { name: 'Remove filter PETG' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Remove filter PLA' })
    ).toBeInTheDocument();
  });

  it('renders nothing without chips', () => {
    const { container } = render(<Empty />);
    expect(container).toBeEmptyDOMElement();
  });
});
