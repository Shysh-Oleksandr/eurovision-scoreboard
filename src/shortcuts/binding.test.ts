import { describe, expect, it } from 'vitest';

import {
  ariaKeyShortcut,
  bindingFromEvent,
  formatBinding,
  isBindable,
  parseBinding,
} from './binding';

const press = (init: Partial<KeyboardEvent> & { key: string }) => ({
  code: '',
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...init,
});

describe('bindingFromEvent', () => {
  it('names Space and uppercases letters', () => {
    expect(bindingFromEvent(press({ key: ' ', code: 'Space' }), true)).toBe(
      'Space',
    );
    expect(bindingFromEvent(press({ key: 'f', code: 'KeyF' }), true)).toBe('F');
    // Caps Lock types "F" without Shift.
    expect(bindingFromEvent(press({ key: 'F', code: 'KeyF' }), false)).toBe(
      'F',
    );
  });

  it('maps ⌘ on Apple and Ctrl elsewhere to Mod', () => {
    expect(
      bindingFromEvent(press({ key: 'z', code: 'KeyZ', metaKey: true }), true),
    ).toBe('Mod+Z');
    expect(
      bindingFromEvent(press({ key: 'z', code: 'KeyZ', ctrlKey: true }), false),
    ).toBe('Mod+Z');
    // The Mac's Control key isn't ⌘: Ctrl+R there never matches R or ⌘R.
    expect(
      bindingFromEvent(press({ key: 'r', code: 'KeyR', ctrlKey: true }), true),
    ).toBe('Ctrl+R');
    expect(
      bindingFromEvent(press({ key: 'r', code: 'KeyR', metaKey: true }), false),
    ).toBe('Meta+R');
  });

  it('keeps Shift for letters, not for symbols typed with it', () => {
    expect(
      bindingFromEvent(press({ key: 'R', code: 'KeyR', shiftKey: true }), true),
    ).toBe('Shift+R');
    expect(
      bindingFromEvent(
        press({ key: '?', code: 'Slash', shiftKey: true }),
        false,
      ),
    ).toBe('?');
  });

  it('matches letters by character on Latin layouts (AZERTY Z)', () => {
    // AZERTY: the key labelled Z sits where QWERTY has W.
    expect(bindingFromEvent(press({ key: 'z', code: 'KeyW' }), false)).toBe(
      'Z',
    );
  });

  it('falls back to the key position on non-Latin layouts', () => {
    // Ukrainian: S types "і", F types "а".
    expect(bindingFromEvent(press({ key: 'і', code: 'KeyS' }), false)).toBe(
      'S',
    );
    expect(bindingFromEvent(press({ key: 'а', code: 'KeyF' }), false)).toBe(
      'F',
    );
    // Greek ⌘Z.
    expect(
      bindingFromEvent(press({ key: 'ζ', code: 'KeyZ', metaKey: true }), true),
    ).toBe('Mod+Z');
  });

  it('uses the key position under ⌥ on a Mac (⌥F types ƒ)', () => {
    expect(
      bindingFromEvent(press({ key: 'ƒ', code: 'KeyF', altKey: true }), true),
    ).toBe('Alt+F');
    expect(
      bindingFromEvent(press({ key: '¡', code: 'Digit1', altKey: true }), true),
    ).toBe('Alt+1');
  });

  it('ignores bare modifiers, dead keys and IME composition', () => {
    expect(bindingFromEvent(press({ key: 'Shift' }), true)).toBeNull();
    expect(bindingFromEvent(press({ key: 'Meta' }), true)).toBeNull();
    expect(
      bindingFromEvent(press({ key: 'Dead', code: 'Quote' }), false),
    ).toBeNull();
    expect(bindingFromEvent(press({ key: 'Process' }), false)).toBeNull();
  });
});

describe('parseBinding', () => {
  it('splits modifiers from the key, "+" included', () => {
    expect(parseBinding('Mod+Shift+Z')).toEqual({
      modifiers: ['Mod', 'Shift'],
      key: 'Z',
    });
    expect(parseBinding('Mod++')).toEqual({ modifiers: ['Mod'], key: '+' });
    expect(parseBinding('+')).toEqual({ modifiers: [], key: '+' });
    expect(parseBinding('Space')).toEqual({ modifiers: [], key: 'Space' });
  });
});

describe('isBindable', () => {
  it('keeps Escape and Tab for the page', () => {
    expect(isBindable('Escape')).toBe(false);
    expect(isBindable('Shift+Tab')).toBe(false);
    expect(isBindable(null)).toBe(false);
    expect(isBindable('Space')).toBe(true);
    expect(isBindable('Mod+Z')).toBe(true);
  });
});

describe('formatBinding', () => {
  it('reads like the platform', () => {
    expect(formatBinding('Mod+Z', true, 'Space')).toBe('⌘Z');
    expect(formatBinding('Mod+Z', false, 'Space')).toBe('Ctrl+Z');
    expect(formatBinding('Mod+Shift+Z', true, 'Space')).toBe('⇧⌘Z');
    expect(formatBinding('Shift+R', false, 'Space')).toBe('Shift+R');
    expect(formatBinding('Space', false, 'Пробіл')).toBe('Пробіл');
    expect(formatBinding('Enter', true, 'Space')).toBe('↵');
    expect(formatBinding('?', true, 'Space')).toBe('?');
  });
});

describe('ariaKeyShortcut', () => {
  it('uses KeyboardEvent names', () => {
    expect(ariaKeyShortcut('Mod+Z', true)).toBe('Meta+Z');
    expect(ariaKeyShortcut('Mod+Z', false)).toBe('Control+Z');
    expect(ariaKeyShortcut('Space', false)).toBe('Space');
  });
});
