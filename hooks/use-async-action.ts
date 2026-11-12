'use client';

import { useCallback, useState, useTransition } from 'react';
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

// router.refresh() resolves before the refreshed server components are on
// screen. Run inside a transition, `isPending` stays true until they are, so
// callers stay pending across the refresh: no flash of the old state
// ("Request" again) between the action finishing and the new data arriving.
function useRefresh() {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const refresh = useCallback(
    () => startTransition(() => router.refresh()),
    [router]
  );
  return { refreshing, refresh };
}

// Shared `pending → await → toast → router.refresh()` shape for a single
// in-flight action (e.g. one form). For per-row lists, use useKeyedAsyncAction.
// Pending lasts until the refreshed UI has rendered (see useRefresh).
export function useAsyncAction() {
  const { refreshing, refresh: refreshRoute } = useRefresh();
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async <T>(fn: () => Promise<T>, opts: RunOptions<T> = {}) => {
      const {
        success,
        refresh = true,
        resetOnSuccess = true,
        onSuccess,
      } = opts;
      setPending(true);
      try {
        const result = await fn();
        if (success) toast.success(success);
        onSuccess?.(result);
        if (refresh) refreshRoute();
        if (resetOnSuccess) setPending(false);
        return result;
      } catch (e) {
        toast.error(resolveErrorMessage(e, opts));
        setPending(false);
        return undefined;
      }
    },
    [refreshRoute]
  );

  return { pending: pending || refreshing, run };
}

// Same shape, but tracks which item (by key) is in flight — for action
// buttons inside a list, where only that row's button should show pending.
// The key stays set until the refreshed row has rendered (see useRefresh).
export function useKeyedAsyncAction<K = string>() {
  const { refreshing, refresh: refreshRoute } = useRefresh();
  const [lastKey, setLastKey] = useState<K | null>(null);
  const [inFlight, setInFlight] = useState(false);

  const run = useCallback(
    async <T>(key: K, fn: () => Promise<T>, opts: RunOptions<T> = {}) => {
      const { success, refresh = true, onSuccess } = opts;
      setLastKey(key);
      setInFlight(true);
      try {
        const result = await fn();
        if (success) toast.success(success);
        onSuccess?.(result);
        if (refresh) refreshRoute();
        return result;
      } catch (e) {
        toast.error(resolveErrorMessage(e, opts));
        return undefined;
      } finally {
        setInFlight(false);
      }
    },
    [refreshRoute]
  );

  return { pendingKey: inFlight || refreshing ? lastKey : null, run };
}
