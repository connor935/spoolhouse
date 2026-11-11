'use client';

import { useSyncExternalStore } from 'react';

// Below Tailwind's `sm`: where the boards swap popovers for bottom sheets.
const MOBILE_QUERY = '(max-width: 639px)';

function subscribe(onChange: () => void) {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** True on phone-width viewports; false during SSR. */
export function useIsMobile() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false
  );
}
