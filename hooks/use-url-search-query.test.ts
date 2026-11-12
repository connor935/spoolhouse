import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUrlSearchQuery } from './use-url-search-query';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

type Props = { url: string; busy: boolean; navigate: (q: string) => void };

function setup(initial = '') {
  const navigate = vi.fn();
  const hook = renderHook(
    ({ url, busy, navigate }: Props) => useUrlSearchQuery(url, navigate, busy),
    { initialProps: { url: initial, busy: false, navigate } }
  );
  return { navigate, ...hook };
}

describe('useUrlSearchQuery', () => {
  it('starts from the URL and does not navigate on mount', () => {
    const { result, navigate } = setup('petg');
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.query).toBe('petg');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('navigates once typing settles', () => {
    const { result, navigate } = setup();
    act(() => result.current.setQuery('p'));
    act(() => result.current.setQuery('pla'));
    act(() => vi.advanceTimersByTime(299));
    expect(navigate).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith('pla');
  });

  it('ignores whitespace-only changes', () => {
    const { result, navigate } = setup('pla');
    act(() => result.current.setQuery('pla '));
    act(() => vi.advanceTimersByTime(300));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('copies an outside URL change (back/forward) into the box', () => {
    const { result, rerender, navigate } = setup('pla');
    rerender({ url: 'asa', busy: false, navigate });
    expect(result.current.query).toBe('asa');
    act(() => vi.advanceTimersByTime(300));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('waits while its own navigation is in flight', () => {
    const { result, rerender, navigate } = setup('');
    act(() => result.current.setQuery('pla'));
    act(() => vi.advanceTimersByTime(300));
    // Our navigation is pending; the user keeps typing.
    act(() => result.current.setQuery('pla si'));
    rerender({ url: 'pla', busy: true, navigate });
    expect(result.current.query).toBe('pla si');
    // It lands: the URL equals what we requested, so typing is kept.
    rerender({ url: 'pla', busy: false, navigate });
    expect(result.current.query).toBe('pla si');
  });

  it('reset changes the box without navigating again', () => {
    const { result, navigate } = setup('pla');
    act(() => result.current.reset(''));
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.query).toBe('');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('uses the latest navigate callback', () => {
    const { result, rerender, navigate } = setup();
    const next = vi.fn();
    rerender({ url: '', busy: false, navigate: next });
    act(() => result.current.setQuery('tpu'));
    act(() => vi.advanceTimersByTime(300));
    expect(next).toHaveBeenCalledWith('tpu');
    expect(navigate).not.toHaveBeenCalled();
  });
});
