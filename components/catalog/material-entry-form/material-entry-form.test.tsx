import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';

import * as stories from './material-entry-form.stories';

const { Request, Empty, AdminAdd, EditRejected, EditAsAdmin } =
  composeStories(stories);

describe('MaterialEntryForm', () => {
  it('submits the request with type and hex colour', async () => {
    const onSubmit = fn();
    render(<Request onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('radio', { name: 'PETG' }));
    await userEvent.click(screen.getByRole('button', { name: 'Request' }));
    expect(onSubmit).toHaveBeenCalledWith({
      manufacturer: 'Extrudr',
      name: 'Mint',
      filamentType: 'PETG',
      color: '#9ADBC0',
    });
  });

  it('previews the entry as it will appear in the catalog', async () => {
    const { container } = render(<Empty />);
    const preview = () =>
      container.querySelector('[aria-hidden] .display-name')!;
    expect(preview()).toHaveTextContent('Material name');
    await userEvent.type(screen.getByLabelText('Material name'), 'Mint');
    expect(preview()).toHaveTextContent('Mint');
    expect(screen.getByText('Pending review')).toBeInTheDocument();
  });

  it('picks a recent colour and accepts hex without the hash', async () => {
    const onSubmit = fn();
    render(<Request onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Use #F26B21' }));
    expect(screen.getByLabelText('Color')).toHaveValue('#F26B21');
    await userEvent.clear(screen.getByLabelText('Color'));
    await userEvent.type(screen.getByLabelText('Color'), '0086d6');
    expect(screen.getByLabelText('Color')).toHaveValue('#0086D6');
  });

  it('blocks an invalid hex colour', async () => {
    const onSubmit = fn();
    render(<Request onSubmit={onSubmit} />);
    await userEvent.clear(screen.getByLabelText('Color'));
    await userEvent.type(screen.getByLabelText('Color'), '#12');
    expect(screen.getByLabelText('Color')).toHaveAccessibleDescription(
      /hex colour/
    );
    expect(screen.getByRole('button', { name: 'Request' })).toBeDisabled();
  });

  it('sends a cleared colour as null', async () => {
    const onSubmit = fn();
    render(<Request onSubmit={onSubmit} />);
    await userEvent.clear(screen.getByLabelText('Color'));
    await userEvent.click(screen.getByRole('button', { name: 'Request' }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ color: null })
    );
  });

  it('words the admin add and the two edit cases', () => {
    const { unmount } = render(<AdminAdd />);
    expect(screen.getByRole('button', { name: 'Add' })).toBeVisible();
    unmount();
    const second = render(<EditRejected />);
    expect(
      screen.getByRole('button', { name: 'Save & resubmit' })
    ).toBeVisible();
    second.unmount();
    render(<EditAsAdmin />);
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeVisible();
    expect(screen.getByText(/keep the current status/)).toBeVisible();
  });
});
