'use client';
import React, { useCallback } from 'react';

import { useShallow } from 'zustand/shallow';

import { getBinding, ShortcutId } from './actions';
import { ariaKeyShortcut, formatBinding } from './binding';
import { isApplePlatform } from './platform';

import { useHasFinePointer } from '@/hooks/useHasFinePointer';
import { useIsClient } from '@/hooks/useIsClient';
import { IS_NATIVE_APP } from '@/native/platform';
import { useGeneralStore } from '@/state/generalStore';

const useShortcutSettings = () =>
  useGeneralStore(
    useShallow((state) => ({
      enabled: state.settings.enableKeyboardShortcuts,
      showHints: state.settings.showShortcutHints,
      overrides: state.settings.keyboardShortcuts,
    })),
  );

/**
 * Hints show on the website with a mouse or trackpad, with shortcuts and
 * hints switched on: phones, tablets and the apps never see them (the keys
 * still work with a keyboard attached).
 */
export const useShortcutHintsVisible = () => {
  const { enabled, showHints } = useShortcutSettings();
  const hasFinePointer = useHasFinePointer();

  return enabled && showHints && hasFinePointer && !IS_NATIVE_APP;
};

/**
 * Hints show a key as it looks on the keyboard, like ↵ for Enter: Space is
 * "␣", short enough for the corner of a narrow button in any language (the
 * settings list spells it out).
 */
export const SPACE_GLYPH = '␣';

/**
 * Formats an action's key for its hint ("␣", "⌘Z", "Ctrl+Z"), or null when
 * hints don't show or the action has no key. One subscription for a
 * component that labels several actions (a menu).
 */
export const useShortcutHintFormatter = () => {
  const { overrides } = useShortcutSettings();
  const visible = useShortcutHintsVisible();

  return useCallback(
    (id: ShortcutId | undefined): string | null => {
      if (!visible || !id) return null;

      const binding = getBinding(id, overrides);

      return binding
        ? formatBinding(binding, isApplePlatform(), SPACE_GLYPH)
        : null;
    },
    [visible, overrides],
  );
};

export const useShortcutHint = (id: ShortcutId | undefined) =>
  useShortcutHintFormatter()(id);

/**
 * The `aria-keyshortcuts` value while shortcuts are on (whatever the
 * pointer: screen reader users get it everywhere). Client only, since the
 * platform decides ⌘ or Ctrl.
 */
export const useAriaKeyShortcuts = (
  id: ShortcutId | undefined,
): string | undefined => {
  const { enabled, overrides } = useShortcutSettings();
  const isClient = useIsClient();

  if (!enabled || !id || !isClient) return undefined;

  const binding = getBinding(id, overrides);

  return binding ? ariaKeyShortcut(binding, isApplePlatform()) : undefined;
};

/**
 * The quiet text naming a shortcut. `corner` sits in the top-right corner
 * of a labelled button (the button is `relative`); `inline` follows a menu
 * row's or a compact control's label. Hidden from screen readers, which get
 * `aria-keyshortcuts` instead.
 */
export const SHORTCUT_HINT_CLASS = {
  corner:
    'pointer-events-none absolute right-[7px] top-[5px] text-[10px] font-bold leading-none normal-case tracking-normal tabular-nums opacity-55',
  inline:
    'pointer-events-none shrink-0 text-[11.5px] font-bold leading-none normal-case tracking-normal tabular-nums opacity-50',
} as const;

/**
 * A hint's text with Space drawn as the key's own symbol: the font's "␣"
 * sits on the baseline, too low and small next to the letters.
 */
export const ShortcutHintText = ({ hint }: { hint: string }) => {
  const at = hint.indexOf(SPACE_GLYPH);

  if (at < 0) return <>{hint}</>;

  return (
    <span className="inline-flex items-center">
      {hint.slice(0, at)}
      <svg
        viewBox="0 0 14 7"
        className="h-[0.7em] w-[1.4em]"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M1.5 1v4.5h11V1" />
      </svg>
      {hint.slice(at + 1)}
    </span>
  );
};

export const ShortcutHint = ({
  id,
  placement = 'corner',
  className = '',
}: {
  id: ShortcutId;
  placement?: keyof typeof SHORTCUT_HINT_CLASS;
  className?: string;
}) => {
  const hint = useShortcutHint(id);

  if (!hint) return null;

  return (
    <span
      aria-hidden="true"
      className={`${SHORTCUT_HINT_CLASS[placement]} ${className}`}
    >
      <ShortcutHintText hint={hint} />
    </span>
  );
};
