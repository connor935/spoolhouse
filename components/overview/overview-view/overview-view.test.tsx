import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import * as stories from './overview-view.stories';

const { Default, NoGroups, NewUser } = composeStories(stories);

const section = (name: string) => screen.getByRole('region', { name });

describe('OverviewView', () => {
  it('shows the key figures', () => {
    render(<Default />);
    const figures = section('Key figures');
    expect(figures).toHaveTextContent('Spools in stock');
    expect(figures).toHaveTextContent('/ 7');
    expect(figures).toHaveTextContent('−12 % vs. prev. 30 days');
    expect(figures).toHaveTextContent(/\/6 priced|priced/);
  });

  it('lists what runs low and what needs drying', async () => {
    const onMarkDried = fn();
    render(<Default onMarkDried={onMarkDried} />);
    expect(section('Running low')).toHaveTextContent('Prusa Orange');
    const drying = section('Needs drying');
    expect(drying).toHaveTextContent('Fire Engine Red');
    await userEvent.click(
      within(drying).getAllByRole('button', { name: /Mark dried/ })[0]
    );
    expect(onMarkDried).toHaveBeenCalledOnce();
  });

  it('writes the activity feed from the viewer’s side', () => {
    render(<Default />);
    const feed = within(section('Recent activity')).getByRole('list');
    const items = within(feed).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent(
      'Weighed Galaxy Black #01 — 742 g (−58)'
    );
    expect(items[0]).toHaveTextContent('11:30');
    expect(items[1]).toHaveTextContent('Anna Weber requested Prusa Orange #02');
    expect(items[1]).toHaveAttribute('data-unread', 'true');
    expect(items[2]).toHaveTextContent(
      'Mia Koch approved your request for Basic Cyan'
    );
    expect(items[2]).toHaveTextContent('Yday');
  });

  it('answers the first borrow request and weighs borrowed spools', async () => {
    const onApprove = fn();
    const onDecline = fn();
    const onWeighBorrowed = fn();
    render(
      <Default
        onApprove={onApprove}
        onDecline={onDecline}
        onWeighBorrowed={onWeighBorrowed}
      />
    );
    const borrows = section('Borrows');
    await userEvent.click(
      within(borrows).getByRole('button', { name: /Approve/ })
    );
    expect(onApprove).toHaveBeenCalledWith('lend-1');
    await userEvent.click(
      within(borrows).getByRole('button', { name: /Decline/ })
    );
    expect(onDecline).toHaveBeenCalledWith('lend-1');
    await userEvent.click(
      within(borrows).getByRole('button', { name: /Weigh/ })
    );
    expect(onWeighBorrowed).toHaveBeenCalledWith(
      'spool-mia-4',
      expect.any(HTMLElement)
    );
  });

  it('links each group', () => {
    render(<Default />);
    const links = within(section('Groups'))
      .getAllByRole('link')
      .filter((l) => l.getAttribute('href') !== '/groups');
    expect(links.length).toBeGreaterThan(0);
    for (const link of links)
      expect(link.getAttribute('href')).toMatch(/^\/groups\/[\w-]+$/);
  });

  it('leaves out borrows and groups without groups', () => {
    render(<NoGroups />);
    expect(screen.queryByRole('region', { name: 'Borrows' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Groups' })).toBeNull();
  });

  it('onboards a new user', async () => {
    const onAddSpool = fn();
    render(<NewUser onAddSpool={onAddSpool} />);
    expect(screen.getByText('Your shelf is empty')).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Key figures' })).toBeNull();
    await userEvent.click(
      screen.getByRole('button', { name: 'Add your first spool' })
    );
    expect(onAddSpool).toHaveBeenCalled();
  });
});
