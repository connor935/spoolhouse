import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';

import * as stories from './catalog-page.stories';

const { Default, RequestOpen, Mobile } = composeStories(stories);

describe('CatalogPage', () => {
  it('heads the page with the catalog size', () => {
    render(<Default />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Materials' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Global catalog · 23,871 entries')
    ).toBeInTheDocument();
  });

  it('opens the request panel with its form', async () => {
    const onRequestOpenChange = fn();
    render(<Default onRequestOpenChange={onRequestOpenChange} />);
    expect(screen.queryByText('The request form goes here.')).toBeNull();
    await userEvent.click(
      screen.getByRole('button', { name: /Request material/ })
    );
    expect(onRequestOpenChange).toHaveBeenCalledWith(true);
    expect(
      await screen.findByText('The request form goes here.')
    ).toBeInTheDocument();
  });

  it('titles the open panel', () => {
    render(<RequestOpen />);
    expect(
      screen.getByRole('dialog', { name: 'Request a new material' })
    ).toBeInTheDocument();
  });

  it('drops the keyboard hint on phones', () => {
    render(<Mobile />);
    expect(
      screen.getByRole('button', { name: 'Request material' })
    ).toBeInTheDocument();
  });

  it('opens the request panel with R', async () => {
    const onRequestOpenChange = fn();
    render(<Default onRequestOpenChange={onRequestOpenChange} />);
    expect(
      screen.getByRole('button', { name: 'Request material' })
    ).toHaveAttribute('aria-keyshortcuts', 'R');
    await userEvent.keyboard('r');
    expect(onRequestOpenChange).toHaveBeenCalledWith(true);
  });

  it('ignores R inside the open panel', async () => {
    const onRequestOpenChange = fn();
    render(<RequestOpen onRequestOpenChange={onRequestOpenChange} />);
    screen.getByRole('dialog').focus();
    await userEvent.keyboard('r');
    expect(onRequestOpenChange).not.toHaveBeenCalledWith(true);
  });
});
