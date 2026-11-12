import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { materials } from '@/stories/fixtures/inventory';
import { EditMaterialDialog } from './edit-material-dialog';

// Container: the server action, router and toasts are the seams.
const updateMaterial = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('@/app/actions/materials', () => ({ updateMaterial }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
vi.mock('sonner', () => ({ toast }));

const approved = materials.galaxyBlack;
const rejected = { ...approved, status: 'rejected' as const };

beforeEach(() => vi.clearAllMocks());

function renderDialog(
  props: Partial<Parameters<typeof EditMaterialDialog>[0]>
) {
  const onOpenChange = vi.fn();
  render(
    <EditMaterialDialog
      material={approved}
      open
      onOpenChange={onOpenChange}
      {...props}
    />
  );
  return { onOpenChange };
}

describe('EditMaterialDialog', () => {
  it('prefills the form and names the entry', () => {
    renderDialog({ isAdmin: true });
    expect(
      screen.getByRole('dialog', { name: 'Edit material' })
    ).toHaveTextContent('Prusament / Galaxy Black');
    expect(screen.getByLabelText('Material name')).toHaveValue('Galaxy Black');
    expect(screen.queryByText('Rejected')).not.toBeInTheDocument();
  });

  it('saves, toasts, closes and refreshes', async () => {
    updateMaterial.mockResolvedValue(undefined);
    const { onOpenChange } = renderDialog({ isAdmin: true });
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(updateMaterial).toHaveBeenCalledWith(
      approved.id,
      expect.objectContaining({
        manufacturer: 'Prusament',
        name: 'Galaxy Black',
      })
    );
    expect(toast.success).toHaveBeenCalledWith('Material updated');
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('resubmits a rejected entry of a regular user', async () => {
    updateMaterial.mockResolvedValue(undefined);
    renderDialog({ material: rejected });
    expect(screen.getByText('Rejected')).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Save & resubmit' })
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Resubmitted for review')
    );
  });

  it('keeps the dialog open when saving fails', async () => {
    updateMaterial.mockRejectedValue(new Error('masked'));
    const { onOpenChange } = renderDialog({ isAdmin: true });
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Could not update the material')
    );
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
  });

  it('closes on cancel', async () => {
    const { onOpenChange } = renderDialog({});
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
