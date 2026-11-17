'use client';
import { RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useRef, useState } from 'react';

import { Highlight } from '../rows/Highlight';

import {
  assignBinding,
  getBinding,
  getShortcutAction,
  resetBinding,
  SHORTCUT_ACTIONS,
  ShortcutId,
} from '@/shortcuts/actions';
import {
  bindingFromEvent,
  formatBinding,
  isBindable,
} from '@/shortcuts/binding';
import { isApplePlatform } from '@/shortcuts/platform';
import { useGeneralStore } from '@/state/generalStore';

/** i18n keys of the list (the settings model's search reads them too). */
export const SHORTCUT_ACTION_LABEL_KEYS = SHORTCUT_ACTIONS.map(
  (action) => `settings.shortcuts.actions.${action.id}`,
);

interface RecorderProps {
  label: string;
  value: string | null;
  onRecord: (binding: string | null) => void;
}

/**
 * The key of one action as a button: click it, then press the new key.
 * Escape cancels, Backspace or Delete clears it ("Not set"). Listens on the
 * window in the capture phase, so neither the modal (Escape) nor the
 * shortcuts themselves see the keys while it records.
 */
const KeyRecorder = ({ label, value, onRecord }: RecorderProps) => {
  const t = useTranslations('settings.shortcuts');
  const [recording, setRecording] = useState(false);
  const onRecordRef = useRef(onRecord);

  onRecordRef.current = onRecord;

  useEffect(() => {
    if (!recording) return undefined;

    const stop = () => setRecording(false);
    const swallow = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        // Focus moves on; the key stays as it was.
        stop();

        return;
      }

      swallow(event);

      if (event.key === 'Escape') {
        stop();

        return;
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        onRecordRef.current(null);
        stop();

        return;
      }

      const binding = bindingFromEvent(event, isApplePlatform());

      // A bare modifier: wait for the key that goes with it.
      if (!isBindable(binding)) return;

      onRecordRef.current(binding);
      stop();
    };

    // Space or Enter would press the focused recorder again on release.
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', swallow, true);

    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      // Let this press's own keyup pass first.
      window.setTimeout(
        () => window.removeEventListener('keyup', swallow, true),
        0,
      );
    };
  }, [recording]);

  return (
    <button
      type="button"
      aria-label={`${label}: ${value ?? t('notSet')}`}
      aria-pressed={recording}
      onClick={() => setRecording((on) => !on)}
      onBlur={() => setRecording(false)}
      className={`h-[32px] min-w-[92px] rounded-[9px] border px-3 text-[13px] font-bold tabular-nums transition-colors ${
        recording
          ? 'border-white/60 bg-white/[0.13] text-white'
          : 'border-white/[0.14] bg-white/[0.06] hover:bg-white/[0.11]'
      } ${!recording && !value ? 'text-white/45' : 'text-white'}`}
    >
      {recording ? t('pressKey') : value ?? t('notSet')}
    </button>
  );
};

/**
 * Settings → Keyboard shortcuts: every action with its key. A key already
 * in use moves to the action it's given to; the one that lost it says so.
 * Only changes are stored (`settings.keyboardShortcuts`).
 */
export const KeyboardShortcutsList = ({ query = '' }: { query?: string }) => {
  const t = useTranslations('settings.shortcuts');
  const overrides = useGeneralStore(
    (state) => state.settings.keyboardShortcuts,
  );
  const setSettings = useGeneralStore((state) => state.setSettings);
  /** Action → the action that took its key, until it gets a new one. */
  const [movedTo, setMovedTo] = useState<
    Partial<Record<ShortcutId, ShortcutId>>
  >({});

  const isApple = isApplePlatform();
  const format = (binding: string | null) =>
    binding ? formatBinding(binding, isApple, t('keys.space')) : null;
  const label = (id: ShortcutId) => t(`actions.${id}`);

  const apply = (id: ShortcutId, result: ReturnType<typeof assignBinding>) => {
    setSettings({ keyboardShortcuts: result.overrides });
    setMovedTo((current) => {
      const next = { ...current };

      delete next[id];
      result.displaced.forEach((other) => {
        next[other] = id;
      });

      return next;
    });
  };

  const q = query.trim().toLowerCase();
  const matching = SHORTCUT_ACTIONS.filter((action) =>
    label(action.id).toLowerCase().includes(q),
  );
  // A search for the list itself ("keys") shows every row.
  const rows = q && matching.length > 0 ? matching : SHORTCUT_ACTIONS;
  const hasOverrides = Object.keys(overrides ?? {}).length > 0;

  return (
    <div className="flex flex-col">
      <p className="px-3 pb-1 pt-2 text-[12.5px] text-white/50">
        {t('changeHint')}
      </p>
      {rows.map(({ id }) => {
        const binding = getBinding(id, overrides);
        const isChanged = overrides?.[id] !== undefined;
        const taker = movedTo[id];

        return (
          <div
            key={id}
            className="flex items-center gap-3 rounded-[10px] px-3 py-[9px]"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[14.5px] font-semibold text-white">
                <Highlight text={label(id)} query={query} />
              </div>
              {taker && binding === null && (
                <p className="mt-0.5 text-[12.5px] text-white/50">
                  {t('movedTo', { action: label(taker) })}
                </p>
              )}
            </div>
            {isChanged && (
              <button
                type="button"
                title={t('resetTo', {
                  key:
                    format(getShortcutAction(id).defaultBinding) ?? t('notSet'),
                })}
                aria-label={t('resetTo', {
                  key:
                    format(getShortcutAction(id).defaultBinding) ?? t('notSet'),
                })}
                onClick={() => apply(id, resetBinding(overrides, id))}
                className="grid size-[32px] shrink-0 place-items-center rounded-[9px] text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
              >
                <RotateCcw className="size-4" />
              </button>
            )}
            <KeyRecorder
              label={label(id)}
              value={format(binding)}
              onRecord={(next) => apply(id, assignBinding(overrides, id, next))}
            />
          </div>
        );
      })}
      <div className="px-3 pb-1 pt-2">
        <button
          type="button"
          disabled={!hasOverrides}
          onClick={() => {
            setSettings({ keyboardShortcuts: {} });
            setMovedTo({});
          }}
          className="h-[32px] rounded-[9px] border border-white/[0.14] bg-white/[0.06] px-3 text-[13px] font-bold text-white transition-colors hover:bg-white/[0.11] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/[0.06]"
        >
          {t('resetAll')}
        </button>
      </div>
    </div>
  );
};
