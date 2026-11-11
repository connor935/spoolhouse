'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';

import { findHotkey } from '@/lib/hotkeys';

export type Hotkeys = Record<string, () => void>;

/**
 * Page-level single-key shortcuts, e.g. `useHotkeys({ n: addSpool })`. Keys
 * are lowercase letters or symbols; never fires while typing, inside a
 * dialog/menu, or with Ctrl/Meta/Alt (see lib/hotkeys.ts). The handlers are
 * read through a ref, so passing a fresh object per render doesn't rebind.
 */
export function useHotkeys(bindings: Hotkeys, enabled = true) {
  const latest = useRef(bindings);
  // Layout effect: refreshed before any later keydown can run, even after a
  // transition render (the review queue moving on to its next entry).
  useLayoutEffect(() => {
    latest.current = bindings;
  });

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const handler = findHotkey(event, target, latest.current);
      if (!handler) return;
      // Otherwise "/" would also type itself into the search it focuses.
      event.preventDefault();
      handler();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
