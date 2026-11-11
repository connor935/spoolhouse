import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';

import { materialGroupStock } from '@/stories/fixtures/material-detail';

import * as stories from './material-group-stock-table.stories';

const { Default, Requesting } = composeStories(stories);

const rows = () => screen.getAllByRole('row').slice(1);

describe('MaterialGroupStockTable', () => {
  it('lists member, group, number and weight per spool', () => {
    render(<Default />);
    expect(rows()).toHaveLength(3);
    const [anna] = rows();
    expect(anna).toHaveTextContent('Anna Weber');
    expect(anna).toHaveTextContent('Print Farm Friends');
    expect(anna).toHaveTextContent('#02');
  });

  it('requests a free spool', async () => {
    const onRequest = fn();
    render(<Default onRequest={onRequest} />);
    await userEvent.click(
      within(rows()[0]).getByRole('button', {
        name: /^Request .+'s spool #\d+$/,
      })
    );
    expect(onRequest).toHaveBeenCalledWith(materialGroupStock[0]);
  });

  it('shows your pending request with a cancel', async () => {
    const onCancelRequest = fn();
    render(<Default onCancelRequest={onCancelRequest} />);
    const jonas = rows()[1];
    expect(within(jonas).getByText('Awaiting approval')).toBeVisible();
    await userEvent.click(
      within(jonas).getByRole('button', {
        name: /^Cancel request for .+'s spool #\d+$/,
      })
    );
    expect(onCancelRequest).toHaveBeenCalledWith(materialGroupStock[1]);
  });

  it('disables only the running row', () => {
    render(<Requesting />);
    expect(
      within(rows()[0]).getByRole('button', { name: /^Request .+'s spool/ })
    ).toBeDisabled();
    expect(
      within(rows()[2]).getByRole('button', {
        name: /^Request .+'s spool #\d+$/,
      })
    ).toBeEnabled();
  });
});
