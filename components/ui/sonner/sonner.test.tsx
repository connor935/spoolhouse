import { composeStories } from '@storybook/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as stories from './sonner.stories';

const { Default } = composeStories(stories);

describe('Toaster', () => {
  // Sonner keeps toasts in a module-level store that outlives each render.
  afterEach(() => {
    toast.dismiss();
    vi.restoreAllMocks();
  });

  it('shows a toast triggered by toast()', async () => {
    render(<Default />);
    await userEvent.click(screen.getByRole('button', { name: 'Show message' }));
    expect(
      await screen.findByText('Resubmitted for review')
    ).toBeInTheDocument();
  });

  it('shows an error toast styled as an error', async () => {
    render(<Default />);
    await userEvent.click(screen.getByRole('button', { name: 'Show error' }));
    const text = await screen.findByText(
      "Measured weight can't be less than the empty spool weight"
    );
    const toastEl = text.closest('[data-sonner-toast]');
    expect(toastEl).toHaveAttribute('data-type', 'error');
  });

  it('stacks bottom-right on desktop', async () => {
    render(<Default />);
    await userEvent.click(screen.getByRole('button', { name: 'Show success' }));
    await screen.findByText('Weight restored to 935 g total');
    const toaster = document.querySelector('[data-sonner-toaster]');
    expect(toaster).toHaveAttribute('data-y-position', 'bottom');
    expect(toaster).toHaveAttribute('data-x-position', 'right');
  });

  it('drops in top-centre on mobile', async () => {
    const matchMedia = window.matchMedia;
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
      ...matchMedia(query),
      matches: query.includes('max-width'),
    }));
    render(<Default />);
    await userEvent.click(screen.getByRole('button', { name: 'Show success' }));
    await screen.findByText('Weight restored to 935 g total');
    const toaster = document.querySelector('[data-sonner-toaster]');
    expect(toaster).toHaveAttribute('data-y-position', 'top');
    expect(toaster).toHaveAttribute('data-x-position', 'center');
  });
});
