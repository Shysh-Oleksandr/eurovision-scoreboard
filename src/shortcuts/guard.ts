import { Binding, hasCommandModifier } from './binding';

/** Inputs that don't take typing: keys stay shortcuts there (except Space/Enter on keyboard focus). */
const NON_TEXT_INPUT_TYPES = new Set([
  'checkbox',
  'radio',
  'button',
  'submit',
  'reset',
  'range',
  'color',
  'file',
  'image',
  'hidden',
]);

/** Elements that Space or Enter activate. */
const CONTROL_SELECTOR = [
  'button',
  'a[href]',
  'summary',
  '[role="button"]',
  '[role="menuitem"]',
  '[role="tab"]',
  '[role="radio"]',
  '[role="checkbox"]',
  '[role="switch"]',
  '[role="option"]',
  'input',
].join(', ');

/**
 * The televote points field marks itself with this attribute: it keeps what
 * it can type and lets every other key through, so Space randomises while
 * the cursor sits in it.
 */
export const NUMERIC_FIELD_ATTRIBUTE = 'data-shortcut-field';

/** Characters a points field can take; the rest reach the shortcuts. */
const NUMERIC_FIELD_CHARACTERS = /^[0-9.,+\-eE]$/;

const NUMERIC_FIELD_EDITING_KEYS = new Set([
  'Backspace',
  'Delete',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'Enter',
  'Tab',
]);

export const isEditableElement = (element: Element): boolean => {
  const tag = element.tagName;

  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    return !NON_TEXT_INPUT_TYPES.has(
      (element as HTMLInputElement).type.toLowerCase(),
    );
  }

  if ((element as HTMLElement).isContentEditable) return true;

  return (
    element.closest(
      '[contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"]',
    ) !== null
  );
};

const defaultIsFocusVisible = (element: Element) => {
  try {
    return element.matches(':focus-visible');
  } catch {
    return false;
  }
};

type GuardEvent = Pick<
  KeyboardEvent,
  | 'key'
  | 'repeat'
  | 'isComposing'
  | 'defaultPrevented'
  | 'target'
  | 'keyCode'
  | 'ctrlKey'
  | 'metaKey'
>;

export interface GuardInput {
  event: GuardEvent;
  /** What the press makes (`bindingFromEvent`). */
  binding: Binding;
  /** The action runs inside its own modal and in fields (`worksInFields`). */
  worksInFields?: boolean;
  /** A modal, menu, popover or sheet is open (`hasShortcutBlockingOverlay`). */
  hasBlockingOverlay: boolean;
  /** Injectable for tests: jsdom has no `:focus-visible`. */
  isFocusVisible?: (element: Element) => boolean;
}

/**
 * The points field keeps the characters it can type, its editing keys and
 * Enter (its own Vote), plus ⌘/Ctrl combinations while it holds text (copy,
 * paste, undo typing). Everything else passes.
 */
const numericFieldKeeps = (field: Element, event: GuardEvent) => {
  if (NUMERIC_FIELD_CHARACTERS.test(event.key)) return true;
  if (NUMERIC_FIELD_EDITING_KEYS.has(event.key)) return true;

  if (event.ctrlKey || event.metaKey) {
    return ((field as HTMLInputElement).value ?? '') !== '';
  }

  return false;
};

/**
 * True when a key press must not run a shortcut:
 * - a component already handled it, it repeats (held down), or an input
 *   method is composing;
 * - a modal, menu, popover or sheet is open (Escape and the keys are
 *   theirs), unless the action works in fields (⌘S inside its own modal);
 * - the cursor is in a text field, select or editable area (the televote
 *   points field lets through what it can't type);
 * - Space or Enter while a button, link or menu item has keyboard focus:
 *   the key presses that element. Focus left by a mouse click doesn't count.
 */
export const shouldIgnoreShortcut = ({
  event,
  binding,
  worksInFields = false,
  hasBlockingOverlay,
  isFocusVisible = defaultIsFocusVisible,
}: GuardInput): boolean => {
  if (event.defaultPrevented || event.repeat) return true;
  if (event.isComposing || event.keyCode === 229) return true;

  const target =
    event.target && (event.target as Element).tagName
      ? (event.target as Element)
      : null;

  if (worksInFields) {
    // ⌘S never types; a plain key chosen instead still leaves fields alone.
    return (
      !hasCommandModifier(binding) && !!target && isEditableElement(target)
    );
  }

  if (hasBlockingOverlay) return true;
  if (!target) return false;

  if (isEditableElement(target)) {
    const field = target.closest(`[${NUMERIC_FIELD_ATTRIBUTE}="numeric"]`);

    return !field || numericFieldKeeps(field, event);
  }

  if (binding === 'Space' || binding === 'Enter') {
    const control = target.closest(CONTROL_SELECTOR);

    if (control && isFocusVisible(control)) return true;
  }

  return false;
};

/**
 * The focused element is a button or similar that a mouse click left
 * focused: Space or Enter would press it again. When the shortcut has
 * nothing to run, the key is swallowed instead (in the simulation).
 */
export const isMouseFocusedControl = (
  target: EventTarget | null,
  isFocusVisible: (element: Element) => boolean = defaultIsFocusVisible,
) => {
  const element =
    target && (target as Element).tagName ? (target as Element) : null;
  const control = element?.closest(CONTROL_SELECTOR);

  return !!control && !isEditableElement(control) && !isFocusVisible(control);
};
