'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

type RunOptions<T> = {
  success?: string;
  // Static message shown on any error, overriding the thrown error's own message.
  error?: string;
  // Fallback used when the thrown value isn't an Error instance (dynamic-message mode only).
  errorFallback?: string;
  refresh?: boolean;
  resetOnSuccess?: boolean;
  onSuccess?: (result: T) => void;
};

function resolveErrorMessage<T>(e: unknown, opts: RunOptions<T>) {
  if (opts.error) return opts.error;
  if (e instanceof Error) return e.message;
  return opts.errorFallback ?? 'Action failed';
}

// Shared `pending → await → toast → router.refresh()` shape for a single
// in-flight action (e.g. one form). For per-row lists, use useKeyedAsyncAction.
export function useAsyncAction() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async <T,>(fn: () => Promise<T>, opts: RunOptions<T> = {}) => {
      const { success, refresh = true, resetOnSuccess = true, onSuccess } = opts;
      setPending(true);
      try {
        const result = await fn();
        if (success) toast.success(success);
        onSuccess?.(result);
        if (refresh) router.refresh();
        if (resetOnSuccess) setPending(false);
        return result;
      } catch (e) {
        toast.error(resolveErrorMessage(e, opts));
        setPending(false);
        return undefined;
      }
    },
    [router]
  );

  return { pending, run };
}

// Same shape, but tracks which item (by key) is in flight — for action
// buttons inside a list, where only that row's button should show pending.
export function useKeyedAsyncAction<K = string>() {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<K | null>(null);

  const run = useCallback(
    async <T,>(key: K, fn: () => Promise<T>, opts: RunOptions<T> = {}) => {
      const { success, refresh = true, onSuccess } = opts;
      setPendingKey(key);
      try {
        const result = await fn();
        if (success) toast.success(success);
        onSuccess?.(result);
        if (refresh) router.refresh();
        return result;
      } catch (e) {
        toast.error(resolveErrorMessage(e, opts));
        return undefined;
      } finally {
        setPendingKey(null);
      }
    },
    [router]
  );

  return { pendingKey, run };
}
