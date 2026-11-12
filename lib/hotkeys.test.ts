import { describe, expect, it } from 'vitest';

import {
  findHotkey,
  isHotkeyBlocked,
  matchesHotkey,
  type HotkeyEvent,
  type HotkeyTarget,
} from './hotkeys';

const press = (key: string, extra: Partial<HotkeyEvent> = {}): HotkeyEvent => ({
  key,
  code: /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : '',
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  repeat: false,
  isComposing: false,
  defaultPrevented: false,
  ...extra,
});

const el = (
  tagName: string,
  { editable = false, inside = [] as string[] } = {}
): HotkeyTarget => ({
  tagName,
  isContentEditable: editable,
  closest: (selector) =>
    inside.some((role) => selector.includes(`[role="${role}"]`)) ? {} : null,
});

describe('matchesHotkey', () => {
  it('matches a plain letter', () => {
    expect(matchesHotkey(press('n'), 'n')).toBe(true);
    expect(matchesHotkey(press('m'), 'n')).toBe(false);
  });

  it('ignores Caps Lock but not Shift on letters', () => {
    expect(matchesHotkey(press('N'), 'n')).toBe(true);
    expect(matchesHotkey(press('N', { shiftKey: true }), 'n')).toBe(false);
  });

  it('falls back to the physical key on non-Latin layouts only', () => {
    // Russian "т" sits on KeyN.
    expect(matchesHotkey(press('т', { code: 'KeyN' }), 'n')).toBe(true);
    expect(matchesHotkey(press('т', { code: 'KeyM' }), 'n')).toBe(false);
    // AZERTY: "q" on KeyA must not count as A.
    expect(matchesHotkey(press('q', { code: 'KeyA' }), 'a')).toBe(false);
  });

  it('lets symbols need Shift (German "/" is Shift+7)', () => {
    expect(matchesHotkey(press('/'), '/')).toBe(true);
    expect(matchesHotkey(press('/', { shiftKey: true }), '/')).toBe(true);
    expect(matchesHotkey(press('7', { shiftKey: true }), '/')).toBe(false);
  });

  it.each(['ctrlKey', 'metaKey', 'altKey'] as const)(
    'never fires with %s',
    (modifier) => {
      expect(matchesHotkey(press('n', { [modifier]: true }), 'n')).toBe(false);
      expect(matchesHotkey(press('/', { [modifier]: true }), '/')).toBe(false);
    }
  );

  it.each(['repeat', 'isComposing', 'defaultPrevented'] as const)(
    'never fires when %s',
    (flag) => {
      expect(matchesHotkey(press('a', { [flag]: true }), 'a')).toBe(false);
    }
  );
});

describe('isHotkeyBlocked', () => {
  it.each(['INPUT', 'TEXTAREA', 'SELECT'])('blocks typing in %s', (tag) => {
    expect(isHotkeyBlocked(el(tag))).toBe(true);
  });

  it('blocks contenteditable', () => {
    expect(isHotkeyBlocked(el('DIV', { editable: true }))).toBe(true);
  });

  it.each(['dialog', 'alertdialog', 'menu', 'listbox', 'combobox'])(
    'blocks focus inside a %s',
    (role) => {
      expect(isHotkeyBlocked(el('BUTTON', { inside: [role] }))).toBe(true);
    }
  );

  it('allows the page itself and plain buttons', () => {
    expect(isHotkeyBlocked(null)).toBe(false);
    expect(isHotkeyBlocked(el('BODY'))).toBe(false);
    expect(isHotkeyBlocked(el('BUTTON'))).toBe(false);
  });
});

describe('findHotkey', () => {
  const bindings = { n: 'add', '/': 'search' };

  it('returns the matching binding', () => {
    expect(findHotkey(press('n'), el('BODY'), bindings)).toBe('add');
    expect(findHotkey(press('/'), el('BODY'), bindings)).toBe('search');
    expect(findHotkey(press('x'), el('BODY'), bindings)).toBeUndefined();
  });

  it('returns nothing while typing', () => {
    expect(findHotkey(press('n'), el('INPUT'), bindings)).toBeUndefined();
  });
});
