import { composeStories } from '@storybook/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';

import * as stories from './review-queue.stories';

const { Default, NoDuplicates, LastOne, Empty, SpoolType, Busy } =
  composeStories(stories);

describe('ReviewQueue', () => {
  it('shows the entry under review and where it sits in the queue', () => {
    render(<Default />);
    expect(
      screen.getByRole('article', { name: 'Reviewing Galaxy Blue' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('1 of 7 pending · oldest first')
    ).toBeInTheDocument();
  });

  it('runs the decisions and shows their keyboard hints', async () => {
    const onApprove = fn();
    const onReject = fn();
    const onEdit = fn();
    render(
      <Default onApprove={onApprove} onReject={onReject} onEdit={onEdit} />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await userEvent.click(screen.getByRole('button', { name: 'Reject' }));
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(onApprove).toHaveBeenCalledOnce();
    expect(onReject).toHaveBeenCalledOnce();
    expect(onEdit).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: 'Skip' })).toHaveAttribute(
      'href',
      '/admin/materials/review?skip=1'
    );
  });

  it('lists possible duplicates linking to their pages, with the rejection hint', () => {
    render(<Default />);
    const section = screen.getByRole('region', { name: 'Possible duplicates' });
    expect(
      within(section).getByRole('link', { name: 'Sunlu · Galaxy Dark Blue' })
    ).toHaveAttribute('href', '/materials/dup-galaxy-dark-blue?from=review');
    expect(
      within(section).getByText(/reject it — the submitter/)
    ).toBeInTheDocument();
  });

  it('says when nothing similar exists', () => {
    render(<NoDuplicates />);
    expect(
      screen.getByText('Nothing similar in the catalog.')
    ).toBeInTheDocument();
  });

  it('lists what comes next and how many more wait', () => {
    render(<Default />);
    const section = screen.getByRole('region', { name: 'Up next' });
    expect(within(section).getAllByRole('listitem')).toHaveLength(2);
    expect(within(section).getByText('+ 4 more')).toBeInTheDocument();
  });

  it('offers no skip for the last entry', () => {
    render(<LastOne />);
    expect(screen.queryByRole('link', { name: /Skip/ })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Up next' })).toBeNull();
  });

  it('celebrates an empty queue and links back', () => {
    render(<Empty />);
    expect(screen.getByText('All caught up')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Back to the catalog' })
    ).toHaveAttribute('href', '/admin/materials');
  });

  it('reviews spool types without swatches', () => {
    render(<SpoolType />);
    expect(screen.getByText('Spool type name')).toBeInTheDocument();
    expect(screen.getByText('Same name')).toBeInTheDocument();
  });

  it('locks the decisions while one runs', () => {
    render(<Busy />);
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
  });
});
