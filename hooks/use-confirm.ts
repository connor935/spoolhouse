'use client';

import { useCallback, useRef, useState } from 'react';

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

// Promise-based confirm, replacing `window.confirm` with the app's own
// styled Dialog. `await confirm({...})` resolves true/false; render
// `<ConfirmDialog {...dialogProps} />` once alongside it.
export function useConfirm() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function settle(result: boolean) {
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
  }

  return {
    confirm,
    dialogProps: {
      open: options !== null,
      options,
      onConfirm: () => settle(true),
      onCancel: () => settle(false),
    },
  };
}
