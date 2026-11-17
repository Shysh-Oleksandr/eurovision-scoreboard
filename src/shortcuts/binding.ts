/**
 * A key or key combination in a stable, platform-free form: modifiers in a
 * fixed order (`Mod`, `Ctrl`, `Meta`, `Alt`, `Shift`), then the key, joined
 * with `+`: "Space", "F", "Shift+R", "Mod+Z", "?", "Enter".
 *
 * `Mod` is ⌘ on Apple platforms and Ctrl elsewhere, so a binding synced from
 * a Mac works on Windows. `Ctrl` (the Mac's Control key) and `Meta` (the
 * Windows key) only appear when recorded on that platform.
 */
export type Binding = string;

type KeyLike = Pick<
  KeyboardEvent,
  'key' | 'code' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
>;

const MODIFIER_KEYS = new Set([
  'Shift',
  'Control',
  'Alt',
  'AltGraph',
  'Meta',
  'OS',
  'Super',
  'Hyper',
  'Fn',
  'FnLock',
  'CapsLock',
  'NumLock',
  'ScrollLock',
  'Symbol',
  'SymbolLock',
]);

/** Keys that belong to the page: focus moves and dialogs close with them. */
const RESERVED_KEYS = new Set(['Escape', 'Tab']);

const MODIFIER_ORDER = ['Mod', 'Ctrl', 'Meta', 'Alt', 'Shift'] as const;

type Modifier = (typeof MODIFIER_ORDER)[number];

/**
 * A key that types a symbol ("?", "/", "ß"). Shift is part of how it's
 * typed on some layouts, never part of its binding.
 */
const isSymbol = (key: string) => key.length === 1 && !/^[A-Z0-9]$/.test(key);

/**
 * The key part of a binding, or null for keys that can't be one (a bare
 * modifier, a dead key, an IME composition).
 *
 * Letters match by the character they type, so Z is the key labelled Z on
 * AZERTY or QWERTZ. A layout that types non-Latin letters (Ukrainian,
 * Greek…), and ⌥ on a Mac (⌥F types ƒ), match by the key's place instead,
 * so S still opens setup without switching layouts.
 */
export const keyNameFromEvent = (e: KeyLike): string | null => {
  const { key, code } = e;

  if (!key || MODIFIER_KEYS.has(key)) return null;
  if (key === ' ' || key === 'Spacebar') return 'Space';
  if (/^[a-z]$/i.test(key)) return key.toUpperCase();

  if (
    /^Key[A-Z]$/.test(code) &&
    (e.altKey || key === 'Dead' || (key.length === 1 && /\p{L}/u.test(key)))
  ) {
    return code.slice(3);
  }

  if (e.altKey && /^Digit[0-9]$/.test(code)) return code.slice(5);
  if (key === 'Dead' || key === 'Unidentified' || key === 'Process') {
    return null;
  }

  return key;
};

/** The binding a key press makes, or null when the key can't be bound. */
export const bindingFromEvent = (
  e: KeyLike,
  isApple: boolean,
): Binding | null => {
  const key = keyNameFromEvent(e);

  if (!key) return null;

  const modifiers: Modifier[] = [];

  if (isApple ? e.metaKey : e.ctrlKey) modifiers.push('Mod');
  if (isApple && e.ctrlKey) modifiers.push('Ctrl');
  if (!isApple && e.metaKey) modifiers.push('Meta');
  if (e.altKey) modifiers.push('Alt');
  if (e.shiftKey && !isSymbol(key)) modifiers.push('Shift');

  return [...modifiers, key].join('+');
};

export const parseBinding = (
  binding: Binding,
): { modifiers: Modifier[]; key: string } => {
  // The key itself may be "+" ("Mod++", "+").
  const split =
    binding.length > 1 ? binding.lastIndexOf('+', binding.length - 2) : -1;

  if (split < 0) return { modifiers: [], key: binding };

  return {
    modifiers: binding
      .slice(0, split)
      .split('+')
      .filter((part): part is Modifier =>
        (MODIFIER_ORDER as readonly string[]).includes(part),
      ),
    key: binding.slice(split + 1),
  };
};

/** Escape and Tab stay the page's; everything else can be a shortcut. */
export const isBindable = (binding: Binding | null): binding is Binding =>
  !!binding && !RESERVED_KEYS.has(parseBinding(binding).key);

/** True when the press carries ⌘/Ctrl (or the Mac's Control, the Windows key). */
export const hasCommandModifier = (binding: Binding) =>
  parseBinding(binding).modifiers.some(
    (modifier) => modifier !== 'Shift' && modifier !== 'Alt',
  );

const KEY_GLYPHS: Record<string, string> = {
  Enter: '↵',
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Backspace: '⌫',
  Delete: 'Del',
};

const APPLE_MODIFIERS: Record<Modifier, string> = {
  Ctrl: '⌃',
  Alt: '⌥',
  Shift: '⇧',
  Mod: '⌘',
  Meta: '⌘',
};

const OTHER_MODIFIERS: Record<Modifier, string> = {
  Mod: 'Ctrl',
  Ctrl: 'Ctrl',
  Meta: 'Win',
  Alt: 'Alt',
  Shift: 'Shift',
};

/** Apple's menus list modifiers in this order: ⌃⌥⇧⌘. */
const APPLE_ORDER: Modifier[] = ['Ctrl', 'Alt', 'Shift', 'Mod', 'Meta'];

/**
 * How a binding reads on this platform: "⌘Z" / "Ctrl+Z", "⇧R" / "Shift+R",
 * the translated "Space", "↵" for Enter.
 */
export const formatBinding = (
  binding: Binding,
  isApple: boolean,
  spaceLabel: string,
): string => {
  const { modifiers, key } = parseBinding(binding);
  const keyLabel = key === 'Space' ? spaceLabel : KEY_GLYPHS[key] ?? key;

  if (isApple) {
    const glyphs = APPLE_ORDER.filter((m) => modifiers.includes(m))
      .map((m) => APPLE_MODIFIERS[m])
      .join('');

    return `${glyphs}${keyLabel}`;
  }

  return [...modifiers.map((m) => OTHER_MODIFIERS[m]), keyLabel].join('+');
};

/** The `aria-keyshortcuts` form: "Meta+Z", "Control+Z", "Shift+R", "Space". */
export const ariaKeyShortcut = (binding: Binding, isApple: boolean) => {
  const { modifiers, key } = parseBinding(binding);
  const names: Record<Modifier, string> = {
    Mod: isApple ? 'Meta' : 'Control',
    Ctrl: 'Control',
    Meta: 'Meta',
    Alt: 'Alt',
    Shift: 'Shift',
  };

  return [...modifiers.map((m) => names[m]), key].join('+');
};
