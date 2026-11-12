import { act, renderHook } from '@testing-library/react';
import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCombobox } from './use-combobox';

const ITEMS = ['PLA', 'PETG', 'PCTG', 'ASA', 'TPU'];
const filter = (items: string[], q: string) =>
  items.filter((i) => i.toLowerCase().includes(q.toLowerCase()));

const key = (k: string) =>
  ({ key: k, preventDefault: vi.fn() }) as unknown as React.KeyboardEvent;
const change = (value: string) =>
  ({ target: { value } }) as React.ChangeEvent<HTMLInputElement>;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function setup(extra: Partial<Parameters<typeof useCombobox<string>>[0]> = {}) {
  const onSelect = vi.fn();
  const hook = renderHook(() =>
    useCombobox({
      items: ITEMS,
      filter,
      onSelect,
      selectedLabel: 'PLA',
      ...extra,
    })
  );
  return { onSelect, ...hook };
}

describe('useCombobox', () => {
  it('shows the selected label while closed', () => {
    const { result } = setup();
    expect(result.current.open).toBe(false);
    expect(result.current.inputProps.value).toBe('PLA');
    expect(result.current.inputProps['aria-expanded']).toBe(false);
  });

  it('opens on typing and filters, resetting the active option', () => {
    const { result } = setup();
    act(() => result.current.inputProps.onChange(change('p')));
    expect(result.current.open).toBe(true);
    expect(result.current.inputProps.value).toBe('p');
    expect(result.current.results).toEqual(['PLA', 'PETG', 'PCTG', 'TPU']);
    expect(result.current.activeIndex).toBe(0);
  });

  it('caps results but keeps the full filtered list', () => {
    const { result } = setup({ maxResults: 2 });
    act(() => result.current.inputProps.onFocus());
    expect(result.current.results).toHaveLength(2);
    expect(result.current.filtered).toHaveLength(5);
  });

  it('opens with ArrowDown or Enter while closed', () => {
    const { result } = setup();
    act(() => result.current.inputProps.onKeyDown(key('ArrowDown')));
    expect(result.current.open).toBe(true);
  });

  it('ignores other keys while closed', () => {
    const { result } = setup();
    act(() => result.current.inputProps.onKeyDown(key('a')));
    expect(result.current.open).toBe(false);
  });

  it('moves the active option within bounds and selects with Enter', () => {
    const { result, onSelect } = setup({ selectedLabel: '' });
    act(() => result.current.inputProps.onChange(change('pc')));
    // Only PCTG matches: ArrowDown can't go past the end.
    act(() => result.current.inputProps.onKeyDown(key('ArrowDown')));
    expect(result.current.activeIndex).toBe(0);
    act(() => result.current.inputProps.onChange(change('')));
    act(() => result.current.inputProps.onKeyDown(key('ArrowDown')));
    act(() => result.current.inputProps.onKeyDown(key('ArrowDown')));
    act(() => result.current.inputProps.onKeyDown(key('ArrowUp')));
    expect(result.current.activeIndex).toBe(1);
    act(() => result.current.inputProps.onKeyDown(key('ArrowUp')));
    act(() => result.current.inputProps.onKeyDown(key('ArrowUp')));
    expect(result.current.activeIndex).toBe(0);
    act(() => result.current.inputProps.onKeyDown(key('Enter')));
    expect(onSelect).toHaveBeenCalledWith('PLA');
    expect(result.current.open).toBe(false);
    expect(result.current.query).toBe('');
  });

  it('does nothing on Enter without a match', () => {
    const { result, onSelect } = setup();
    act(() => result.current.inputProps.onChange(change('zzz')));
    act(() => result.current.inputProps.onKeyDown(key('Enter')));
    expect(onSelect).not.toHaveBeenCalled();
    expect(result.current.open).toBe(true);
  });

  it('closes on Escape', () => {
    const { result } = setup();
    act(() => result.current.inputProps.onFocus());
    act(() => result.current.inputProps.onKeyDown(key('Escape')));
    expect(result.current.open).toBe(false);
  });

  it('closes shortly after blur so an option click can land first', () => {
    const { result } = setup();
    act(() => result.current.inputProps.onFocus());
    act(() => result.current.inputProps.onBlur());
    act(() => vi.advanceTimersByTime(119));
    expect(result.current.open).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.open).toBe(false);
  });

  it('keeps focus in the input when the listbox is pressed', () => {
    const { result } = setup();
    const preventDefault = vi.fn();
    result.current.listboxProps.onMouseDown({
      preventDefault,
    } as unknown as React.MouseEvent);
    expect(preventDefault).toHaveBeenCalled();
    expect(result.current.listboxProps.role).toBe('listbox');
  });
});
