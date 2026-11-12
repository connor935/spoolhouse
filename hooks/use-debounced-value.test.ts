import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './use-debounced-value';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useDebouncedValue', () => {
  it('starts with the initial value', () => {
    const { result } = renderHook(() => useDebouncedValue('a'));
    expect(result.current).toBe('a');
  });

  it('only takes the last value once it settled', () => {
    const { result, rerender } = renderHook(
      ({ v }) => useDebouncedValue(v, 150),
      { initialProps: { v: 'a' } }
    );
    rerender({ v: 'ab' });
    act(() => vi.advanceTimersByTime(100));
    rerender({ v: 'abc' });
    act(() => vi.advanceTimersByTime(149));
    expect(result.current).toBe('a');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('abc');
  });
});
