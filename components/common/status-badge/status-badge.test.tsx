import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as stories from './status-badge.stories';

const { AllStatuses, CustomLabel } = composeStories(stories);

describe('StatusBadge', () => {
  it('labels each status', () => {
    render(<AllStatuses />);
    for (const label of [
      'Approved',
      'Pending review',
      'Rejected',
      'Imported · SpoolmanDB',
      'Unverified',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('styles approved and rejected apart from the muted statuses', () => {
    render(<AllStatuses />);
    const cls = (label: string) => screen.getByText(label).className;
    expect(cls('Approved')).toContain('text-accent');
    expect(cls('Rejected')).toContain('text-destructive');
    expect(cls('Pending review')).toBe(cls('Unverified'));
  });

  it('lets children override the label', () => {
    render(<CustomLabel />);
    expect(screen.getByText('Imported')).toHaveAttribute('data-status', 'imported');
  });
});
