import type { Binding } from './binding';

export interface ShortcutActionDef {
  id: string;
  /** The key out of the box; null: none until the user picks one. */
  defaultBinding: Binding | null;
  /**
   * Runs from inside its own modal and while a field has focus. Only for
   * ⌘/Ctrl combinations, which never type a character.
   */
  worksInFields?: boolean;
}

/**
 * Every action a keyboard shortcut can run, in the order the settings list
 * shows them. The ids are stored in the user's settings (the
 * `keyboardShortcuts` overrides) and synced with the account: never rename
 * one. Labels: `settings.shortcuts.actions.<id>`.
 */
export const SHORTCUT_ACTIONS = [
  { id: 'random', defaultBinding: 'Space' },
  { id: 'randomNext', defaultBinding: 'N' },
  { id: 'randomVoter', defaultBinding: 'V' },
  { id: 'randomAll', defaultBinding: 'F' },
  { id: 'present', defaultBinding: 'P' },
  { id: 'undo', defaultBinding: 'Mod+Z' },
  { id: 'restart', defaultBinding: 'R' },
  { id: 'continue', defaultBinding: 'Enter' },
  { id: 'setup', defaultBinding: 'S' },
  { id: 'stats', defaultBinding: 'T' },
  { id: 'minimalView', defaultBinding: 'M' },
  { id: 'share', defaultBinding: null },
  { id: 'fullscreen', defaultBinding: null },
  { id: 'cancel', defaultBinding: null },
  { id: 'startStage', defaultBinding: 'Mod+S', worksInFields: true },
  { id: 'shortcutsHelp', defaultBinding: '?' },
] as const satisfies readonly ShortcutActionDef[];

export type ShortcutId = (typeof SHORTCUT_ACTIONS)[number]['id'];

/** What the user changed: an action's own key, or null for "Not set". */
export type ShortcutOverrides = Partial<Record<ShortcutId, Binding | null>>;

const ACTION_IDS = new Set<string>(SHORTCUT_ACTIONS.map((action) => action.id));

export const isShortcutId = (id: string): id is ShortcutId =>
  ACTION_IDS.has(id);

export const getShortcutAction = (id: ShortcutId): ShortcutActionDef =>
  SHORTCUT_ACTIONS.find((action) => action.id === id)!;

/** The key an action has now: the user's override, else its default. */
export const getBinding = (
  id: ShortcutId,
  overrides: ShortcutOverrides | undefined,
): Binding | null => {
  const override = overrides?.[id];

  return override !== undefined
    ? override
    : getShortcutAction(id).defaultBinding;
};

/**
 * The action a key runs. Overrides synced from elsewhere can leave two
 * actions on one key; the first in catalog order wins.
 */
export const getActionForBinding = (
  binding: Binding,
  overrides: ShortcutOverrides | undefined,
): ShortcutId | null =>
  SHORTCUT_ACTIONS.find(
    (action) => getBinding(action.id, overrides) === binding,
  )?.id ?? null;

/**
 * Gives `id` the key `binding` (null clears it). Any other action on that
 * key loses it: the returned `displaced` ids show "Not set" with a note.
 * Overrides that match the default are dropped, so a default changed later
 * still reaches everyone who kept it.
 */
export const assignBinding = (
  overrides: ShortcutOverrides | undefined,
  id: ShortcutId,
  binding: Binding | null,
): { overrides: ShortcutOverrides; displaced: ShortcutId[] } => {
  const next: ShortcutOverrides = { ...overrides };
  const displaced: ShortcutId[] = [];

  if (binding !== null) {
    for (const action of SHORTCUT_ACTIONS) {
      if (action.id !== id && getBinding(action.id, next) === binding) {
        next[action.id] = null;
        displaced.push(action.id);
      }
    }
  }

  next[id] = binding;

  for (const action of SHORTCUT_ACTIONS) {
    if (next[action.id] === action.defaultBinding) delete next[action.id];
  }

  return { overrides: next, displaced };
};

/** Back to the default key; whoever took that key meanwhile gives it up. */
export const resetBinding = (
  overrides: ShortcutOverrides | undefined,
  id: ShortcutId,
) => assignBinding(overrides, id, getShortcutAction(id).defaultBinding);
