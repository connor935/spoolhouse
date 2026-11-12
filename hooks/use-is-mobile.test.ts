import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useIsMobile } from './use-is-mobile';

// A controllable MediaQueryList for the (max-width: 767px) query.
function stubMatchMedia(initial: boolean) {
  const listeners = new Set<() => void>();
  const mql = {
    matches: initial,
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
  };
  const spy = vi
    .spyOn(window, 'matchMedia')
    .mockImplementation(() => mql as unknown as MediaQueryList);
  return {
    spy,
    listeners,
    set(next: boolean) {
      mql.matches = next;
      listeners.forEach((cb) => cb());
    },
  };
}

afterEach(() => vi.restoreAllMocks());

describe('useIsMobile', () => {
  it('is false on desktop widths', () => {
    stubMatchMedia(false);
    expect(renderHook(() => useIsMobile()).result.current).toBe(false);
  });

  it('asks for the md breakpoint and is true below it', () => {
    const { spy } = stubMatchMedia(true);
    expect(renderHook(() => useIsMobile()).result.current).toBe(true);
    expect(spy).toHaveBeenCalledWith('(max-width: 767px)');
  });

  it('follows viewport changes and unsubscribes on unmount', () => {
    const media = stubMatchMedia(false);
    const { result, unmount } = renderHook(() => useIsMobile());
    act(() => media.set(true));
    expect(result.current).toBe(true);
    unmount();
    expect(media.listeners.size).toBe(0);
  });
});
