// Single-key page shortcuts (N add spool, R request, / search, review queue
// R/E/J/A). Pure matching rules, wired up by hooks/use-hotkeys.ts.

export type HotkeyEvent = {
  key: string;
  /** Physical key ("KeyN"): the fallback for non-Latin layouts. */
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  repeat: boolean;
  isComposing: boolean;
  defaultPrevented: boolean;
};

/** The bit of an Element the target check needs (kept structural for tests). */
export type HotkeyTarget = {
  tagName: string;
  isContentEditable?: boolean;
  closest(selector: string): unknown;
};

// Focus inside any of these means the key belongs to that widget: a sheet or
// dialog (including the re-weigh popover), a menu, a list, or a select
// trigger (letters are its typeahead).
const OWNED_BY_WIDGET =
  '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [role="combobox"]';

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/**
 * Whether `event` is the single-key shortcut `key` (a lowercase letter or a
 * symbol). Letters ignore Caps Lock but never fire with Shift, so Shift+A
 * doesn't approve; symbols allow Shift, which some layouts need to type
 * them ("/" is Shift+7 on German keyboards). Letters fall back to the
 * physical key on non-Latin layouts. Ctrl/Meta/Alt combos belong to
 * the browser and OS.
 */
export function matchesHotkey(event: HotkeyEvent, key: string): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  if (event.repeat || event.isComposing || event.defaultPrevented) return false;
  if (/^[a-z]$/.test(key)) {
    if (event.shiftKey) return false;
    const typed = event.key.toLowerCase();
    // Cyrillic, Greek, … type no Latin letter: go by the key's position.
    // Never on Latin layouts, where AZERTY's Q sits on KeyA.
    if (/^\p{L}$/u.test(typed) && !/^[a-z]$/.test(typed))
      return event.code === `Key${key.toUpperCase()}`;
    return typed === key;
  }
  return event.key === key;
}

/** True while the user is typing or working inside an overlay. */
export function isHotkeyBlocked(target: HotkeyTarget | null): boolean {
  if (!target) return false;
  if (TYPING_TAGS.has(target.tagName) || target.isContentEditable) return true;
  return target.closest(OWNED_BY_WIDGET) != null;
}

/** The binding `event` triggers, if any. */
export function findHotkey<T>(
  event: HotkeyEvent,
  target: HotkeyTarget | null,
  bindings: Record<string, T>
): T | undefined {
  if (isHotkeyBlocked(target)) return undefined;
  for (const key of Object.keys(bindings))
    if (matchesHotkey(event, key)) return bindings[key];
  return undefined;
}

/** "/": focus a search field, its text selected so typing replaces it. */
export function focusSearch(input: HTMLInputElement | null) {
  input?.focus();
  input?.select();
}
