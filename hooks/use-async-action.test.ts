import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAsyncAction, useKeyedAsyncAction } from './use-async-action';

const refresh = vi.hoisted(() => vi.fn());
const router = vi.hoisted(() => ({ refresh }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('sonner', () => ({ toast }));

beforeEach(() => vi.clearAllMocks());

describe('useAsyncAction', () => {
  it('runs, toasts, refreshes and returns the result', async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useAsyncAction());
    let value: number | undefined;
    await act(async () => {
      value = await result.current.run(async () => 42, {
        success: 'Saved',
        onSuccess,
      });
    });
    expect(value).toBe(42);
    expect(toast.success).toHaveBeenCalledWith('Saved');
    expect(onSuccess).toHaveBeenCalledWith(42);
    expect(refresh).toHaveBeenCalledOnce();
    expect(result.current.pending).toBe(false);
  });

  it('is pending while the action runs', async () => {
    const { result } = renderHook(() => useAsyncAction());
    let finish!: () => void;
    let done!: Promise<unknown>;
    act(() => {
      done = result.current.run(
        () => new Promise<void>((resolve) => (finish = resolve))
      );
    });
    expect(result.current.pending).toBe(true);
    await act(async () => {
      finish();
      await done;
    });
    expect(result.current.pending).toBe(false);
  });

  it('stays pending after success when asked (navigation follows)', async () => {
    const { result } = renderHook(() => useAsyncAction());
    await act(async () => {
      await result.current.run(async () => null, {
        resetOnSuccess: false,
        refresh: false,
      });
    });
    expect(result.current.pending).toBe(true);
    expect(refresh).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it.each([
    [
      'the static message',
      new Error('raw'),
      { error: 'Could not save' },
      'Could not save',
    ],
    ['the thrown message', new Error('Name taken'), {}, 'Name taken'],
    ['the fallback for non-errors', 'boom', { errorFallback: 'Oops' }, 'Oops'],
    ['the default for non-errors', 'boom', {}, 'Action failed'],
  ])('toasts %s on failure', async (_, thrown, opts, message) => {
    const { result } = renderHook(() => useAsyncAction());
    let value: unknown = 'unset';
    await act(async () => {
      value = await result.current.run(() => Promise.reject(thrown), opts);
    });
    expect(value).toBeUndefined();
    expect(toast.error).toHaveBeenCalledWith(message);
    expect(refresh).not.toHaveBeenCalled();
    expect(result.current.pending).toBe(false);
  });
});

describe('useKeyedAsyncAction', () => {
  it('tracks the key in flight and clears it afterwards', async () => {
    const { result } = renderHook(() => useKeyedAsyncAction<string>());
    let finish!: () => void;
    let done!: Promise<unknown>;
    act(() => {
      done = result.current.run(
        'row-2',
        () => new Promise<void>((resolve) => (finish = resolve)),
        { success: 'Approved' }
      );
    });
    expect(result.current.pendingKey).toBe('row-2');
    await act(async () => {
      finish();
      await done;
    });
    expect(result.current.pendingKey).toBeNull();
    expect(toast.success).toHaveBeenCalledWith('Approved');
    expect(refresh).toHaveBeenCalledOnce();
  });

  it('clears the key and toasts on failure', async () => {
    const { result } = renderHook(() => useKeyedAsyncAction<string>());
    await act(async () => {
      await result.current.run('row-1', () => Promise.reject(new Error('No')), {
        refresh: false,
      });
    });
    expect(result.current.pendingKey).toBeNull();
    expect(toast.error).toHaveBeenCalledWith('No');
  });
});
