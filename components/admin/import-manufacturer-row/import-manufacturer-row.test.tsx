import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fn } from 'storybook/test';
import { describe, expect, it } from 'vitest';
import { importStatus } from './import-manufacturer-row';
import * as stories from './import-manufacturer-row.stories';

const { Imported, NeverImported, LastRunFailed, Disabled, List } =
  composeStories(stories);

describe('importStatus', () => {
  const base = {
    slug: 'x',
    manufacturerName: null,
    importedCount: 0,
    lastError: null,
  };
  it.each([
    [{ ...base }, 'never'],
    [{ ...base, importedCount: 12 }, 'imported'],
    [{ ...base, lastError: '502' }, 'failed'],
    [{ ...base, importedCount: 12, lastError: '502' }, 'failed'],
  ])('%j → %s', (m, expected) => {
    expect(importStatus(m)).toBe(expected);
  });
});

describe('ImportManufacturerRow', () => {
  it.each([
    ['imported', Imported, 'Bambu Lab', '214 imported'],
    ['never imported', NeverImported, 'extrudr', 'never imported'],
    ['failed', LastRunFailed, 'Fiberlogy', 'last run failed'],
  ])('shows the %s status', (_, Story, name, label) => {
    render(<Story />);
    const box = screen.getByRole('checkbox', { name: new RegExp(name) });
    expect(box).toHaveAccessibleName(new RegExp(label));
  });

  it('shows the slug next to a known display name only', () => {
    const { unmount } = render(<Imported />);
    expect(screen.getByText('· bambulab')).toBeInTheDocument();
    unmount();
    render(<NeverImported />);
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });

  it('puts the last error in the status tooltip', () => {
    render(<LastRunFailed />);
    expect(screen.getByText('last run failed')).toHaveAttribute(
      'title',
      'SpoolmanDB returned 502 Bad Gateway.'
    );
  });

  it('toggles from anywhere on the row', async () => {
    const onCheckedChange = fn();
    render(<Imported onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByText('Bambu Lab'));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('is locked while disabled', async () => {
    const onCheckedChange = fn();
    render(<Disabled onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});

describe('ImportSelectAllRow', () => {
  it('is mixed while some rows are selected, and selects all', async () => {
    render(<List />);
    const all = screen.getByRole('checkbox', { name: /Select all visible/ });
    expect(all).toHaveAttribute('aria-checked', 'mixed');
    await userEvent.click(all);
    expect(all).toHaveAttribute('aria-checked', 'true');
    for (const box of screen.getAllByRole('checkbox')) {
      expect(box).toHaveAttribute('aria-checked', 'true');
    }
  });
});
