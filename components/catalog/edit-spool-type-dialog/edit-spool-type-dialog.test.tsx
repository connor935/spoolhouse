import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { spoolTypes } from '@/stories/fixtures/inventory';
import { EditSpoolTypeDialog } from './edit-spool-type-dialog';

const updateSpoolType = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/app/actions/spool-types', () => ({ updateSpoolType }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('sonner', () => ({ toast }));

const approved = spoolTypes.prusamentCardboard;
const pending = { ...approved, status: 'pending' as const };
const rejected = { ...approved, status: 'rejected' as const };

beforeEach(() => vi.clearAllMocks());

function renderDialog(
  props: Partial<Parameters<typeof EditSpoolTypeDialog>[0]>
) {
  const onOpenChange = vi.fn();
  render(
    <EditSpoolTypeDialog
      spoolType={approved}
      open
      onOpenChange={onOpenChange}
      {...props}
    />
  );
  return { onOpenChange };
}

describe('EditSpoolTypeDialog', () => {
  it('prefills the form', () => {
    renderDialog({ isAdmin: true });
    expect(
      screen.getByRole('dialog', { name: 'Edit spool type' })
    ).toHaveTextContent('Prusament / Cardboard 1 kg');
    expect(screen.getByLabelText('Empty spool weight (g)')).toHaveValue('193');
  });

  it('badges a pending entry', () => {
    renderDialog({ spoolType: pending });
    expect(screen.getByText('Pending review')).toBeInTheDocument();
  });

  it('saves, toasts, closes and refreshes', async () => {
    updateSpoolType.mockResolvedValue(undefined);
    const { onOpenChange } = renderDialog({ isAdmin: true });
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(updateSpoolType).toHaveBeenCalledWith(
      approved.id,
      expect.objectContaining({ emptyWeightGrams: 193 })
    );
    expect(toast.success).toHaveBeenCalledWith('Spool type updated');
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('resubmits a rejected entry of a regular user', async () => {
    updateSpoolType.mockResolvedValue(undefined);
    renderDialog({ spoolType: rejected });
    await userEvent.click(
      screen.getByRole('button', { name: 'Save & resubmit' })
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Resubmitted for review')
    );
  });

  it('keeps the dialog open when saving fails', async () => {
    updateSpoolType.mockRejectedValue(new Error('masked'));
    const { onOpenChange } = renderDialog({ isAdmin: true });
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Could not update the spool type'
      )
    );
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
