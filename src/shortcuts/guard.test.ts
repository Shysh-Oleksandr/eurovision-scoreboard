import { afterEach, describe, expect, it } from 'vitest';

import { isMouseFocusedControl, shouldIgnoreShortcut } from './guard';

afterEach(() => {
  document.body.innerHTML = '';
});

const el = (html: string) => {
  document.body.innerHTML = html;

  return document.body.firstElementChild as HTMLElement;
};

const event = (init: Partial<KeyboardEvent> & { key: string }) => ({
  repeat: false,
  isComposing: false,
  defaultPrevented: false,
  keyCode: 0,
  ctrlKey: false,
  metaKey: false,
  target: document.body as EventTarget,
  ...init,
});

const neverFocusVisible = () => false;
const alwaysFocusVisible = () => true;

describe('shouldIgnoreShortcut', () => {
  it('runs on the page itself', () => {
    expect(
      shouldIgnoreShortcut({
        event: event({ key: 'f' }),
        binding: 'F',
        hasBlockingOverlay: false,
      }),
    ).toBe(false);
  });

  it('ignores held keys, handled keys and IME composition', () => {
    const base = { binding: 'Space', hasBlockingOverlay: false };

    expect(
      shouldIgnoreShortcut({
        ...base,
        event: event({ key: ' ', repeat: true }),
      }),
    ).toBe(true);
    expect(
      shouldIgnoreShortcut({
        ...base,
        event: event({ key: ' ', defaultPrevented: true }),
      }),
    ).toBe(true);
    expect(
      shouldIgnoreShortcut({
        ...base,
        event: event({ key: 'Process', isComposing: true }),
      }),
    ).toBe(true);
    expect(
      shouldIgnoreShortcut({
        ...base,
        event: event({ key: ' ', keyCode: 229 }),
      }),
    ).toBe(true);
  });

  it('waits while a modal, menu or popover is open', () => {
    expect(
      shouldIgnoreShortcut({
        event: event({ key: 's' }),
        binding: 'S',
        hasBlockingOverlay: true,
      }),
    ).toBe(true);
  });

  it('leaves text fields, textareas, selects and editable areas alone', () => {
    for (const html of [
      '<input type="text" />',
      '<input />',
      '<textarea></textarea>',
      '<select><option>1</option></select>',
      '<div contenteditable="true"></div>',
    ]) {
      expect(
        shouldIgnoreShortcut({
          event: event({ key: 's', target: el(html) }),
          binding: 'S',
          hasBlockingOverlay: false,
        }),
      ).toBe(true);
    }
  });

  it('lets the televote field keep what it types and pass the rest', () => {
    const field = el('<input type="number" data-shortcut-field="numeric" />');
    const ignored = (key: string, binding: string, extra = {}) =>
      shouldIgnoreShortcut({
        event: event({ key, target: field, ...extra }),
        binding,
        hasBlockingOverlay: false,
      });

    expect(ignored(' ', 'Space')).toBe(false);
    expect(ignored('f', 'F')).toBe(false);
    expect(ignored('7', '7')).toBe(true);
    expect(ignored('e', 'E')).toBe(true);
    expect(ignored('Enter', 'Enter')).toBe(true);
    expect(ignored('Backspace', 'Backspace')).toBe(true);
    // Empty: ⌘Z undoes the vote. With text: it undoes the typing.
    expect(ignored('z', 'Mod+Z', { metaKey: true })).toBe(false);
    (field as HTMLInputElement).value = '12';
    expect(ignored('z', 'Mod+Z', { metaKey: true })).toBe(true);
  });

  it('lets a keyboard-focused button keep Space and Enter', () => {
    const button = el('<button>Setup</button>');

    expect(
      shouldIgnoreShortcut({
        event: event({ key: ' ', target: button }),
        binding: 'Space',
        hasBlockingOverlay: false,
        isFocusVisible: alwaysFocusVisible,
      }),
    ).toBe(true);
    // Letters still run on a focused button.
    expect(
      shouldIgnoreShortcut({
        event: event({ key: 'f', target: button }),
        binding: 'F',
        hasBlockingOverlay: false,
        isFocusVisible: alwaysFocusVisible,
      }),
    ).toBe(false);
    // Focus left by a mouse click doesn't keep Space.
    expect(
      shouldIgnoreShortcut({
        event: event({ key: ' ', target: button }),
        binding: 'Space',
        hasBlockingOverlay: false,
        isFocusVisible: neverFocusVisible,
      }),
    ).toBe(false);
  });

  it('runs ⌘S in its own modal and in fields, a plain key only outside fields', () => {
    const input = el('<input type="text" />');

    expect(
      shouldIgnoreShortcut({
        event: event({ key: 's', metaKey: true, target: input }),
        binding: 'Mod+S',
        worksInFields: true,
        hasBlockingOverlay: true,
      }),
    ).toBe(false);
    expect(
      shouldIgnoreShortcut({
        event: event({ key: 'g', target: input }),
        binding: 'G',
        worksInFields: true,
        hasBlockingOverlay: true,
      }),
    ).toBe(true);
    expect(
      shouldIgnoreShortcut({
        event: event({ key: 'g' }),
        binding: 'G',
        worksInFields: true,
        hasBlockingOverlay: true,
      }),
    ).toBe(false);
  });
});

describe('isMouseFocusedControl', () => {
  it('is a button without keyboard focus', () => {
    const button = el('<button>Setup</button>');

    expect(isMouseFocusedControl(button, neverFocusVisible)).toBe(true);
    expect(isMouseFocusedControl(button, alwaysFocusVisible)).toBe(false);
    expect(isMouseFocusedControl(document.body, neverFocusVisible)).toBe(false);
    expect(
      isMouseFocusedControl(el('<input type="text" />'), neverFocusVisible),
    ).toBe(false);
  });
});
