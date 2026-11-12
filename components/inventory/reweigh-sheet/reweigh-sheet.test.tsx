import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './reweigh-sheet.stories';

const { Owned, Borrowed } = composeStories(stories);

describe('ReweighSheet', () => {
  it('is a titled dialog with the re-weigh form', async () => {
    render(<Owned />);
    const dialog = await screen.findByRole('dialog', {
      name: 'Re-weigh #01 Galaxy Black',
    });
    expect(dialog).toHaveTextContent('Last: 935 g total · 5 days ago');
    expect(
      screen.getByRole('button', { name: 'Edit all details' })
    ).toBeInTheDocument();
  });

  it('names the owner and counts the drop toward the borrow', async () => {
    render(<Borrowed />);
    const dialog = await screen.findByRole('dialog', {
      name: 'Re-weigh #04 Basic Cyan',
    });
    expect(dialog).toHaveTextContent('Borrowed from Mia Koch');
    expect(screen.getByRole('status')).toHaveTextContent(
      '−58 g · counts toward this borrow'
    );
  });

  it('saves the typed total', async () => {
    const onSave = fn();
    render(<Borrowed onSave={onSave} />);
    await screen.findByRole('dialog');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(877);
  });
});
