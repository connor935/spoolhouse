'use client';

import { useSyncExternalStore } from 'react';

// Below Tailwind's `md`: where the app shell switches to the top bar + bottom
// nav, and overlays become bottom sheets instead of dialogs/popovers.
const MOBILE_QUERY = '(max-width: 767px)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

// Server render and hydration assume desktop; mobile switches right after.
export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false
  );
}
