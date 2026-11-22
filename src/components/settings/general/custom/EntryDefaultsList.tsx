'use client';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useMemo } from 'react';

import { Highlight } from '../rows/Highlight';

import {
  getCanonicalCountry,
  sanitizeEntryOverrides,
  withEntryOverrideDefault,
} from '@/data/countries/entryOverrides';
import { getFlagPath } from '@/helpers/getFlagPath';
import { useGeneralStore } from '@/state/generalStore';

/** i18n keys of the list (the settings model's search reads them too). */
export const ENTRY_DEFAULTS_SEARCH_KEYS = [
  'settings.contest.yourNamesAndFlags',
  'settings.contest.yourNamesAndFlagsDesc',
];

/**
 * Settings → Contest: the account's own names and flags new contests start
 * with (`settings.defaultEntryOverrides`, docs/entry-overrides.md). They're
 * set from the name and flag editor's "Use in my new contests"; here they
 * can only be removed, which leaves contests that already use them alone.
 */
export const EntryDefaultsList = ({ query = '' }: { query?: string }) => {
  const t = useTranslations('settings.contest');
  const defaults = useGeneralStore(
    (state) => state.settings.defaultEntryOverrides,
  );
  const setSettings = useGeneralStore((state) => state.setSettings);

  const rows = useMemo(
    () =>
      Object.entries(sanitizeEntryOverrides(defaults))
        .map(([code, override]) => {
          const builtIn = getCanonicalCountry(code)?.name ?? code;
          const name = override.name ?? builtIn;

          return {
            code,
            name,
            flag: getFlagPath({ code, name, flag: override.flag }),
            detail: override.name
              ? override.flag
                ? t('ownFlagInsteadOf', { name: builtIn })
                : t('insteadOf', { name: builtIn })
              : t('ownFlag'),
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    [defaults, t],
  );

  return (
    <div className="flex flex-col">
      <div className="px-3 pb-1 pt-[11px]">
        <div className="text-[14.5px] font-semibold text-white">
          <Highlight text={t('yourNamesAndFlags')} query={query} />
        </div>
        <p className="mt-0.5 text-[12.5px] text-white/50">
          {rows.length > 0 ? t('yourNamesAndFlagsDesc') : t('noNamesAndFlags')}
        </p>
      </div>
      {rows.map((row) => (
        <div
          key={row.code}
          className="flex items-center gap-3 rounded-[10px] px-3 py-[9px]"
        >
          <img
            src={row.flag}
            alt=""
            aria-hidden="true"
            width={28}
            height={20}
            className="h-5 w-7 flex-none rounded-[3px] object-cover"
            onError={(e) => {
              const fallback = getFlagPath('ww');

              if (!e.currentTarget.src.endsWith(fallback)) {
                e.currentTarget.src = fallback;
              }
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14.5px] font-semibold text-white">
              {row.name}
            </div>
            <p className="mt-0.5 truncate text-[12.5px] text-white/50">
              {row.detail}
            </p>
          </div>
          <button
            type="button"
            title={t('removeDefault', { name: row.name })}
            aria-label={t('removeDefault', { name: row.name })}
            onClick={() =>
              setSettings({
                defaultEntryOverrides: withEntryOverrideDefault(
                  defaults,
                  row.code,
                  null,
                ),
              })
            }
            className="grid size-[32px] shrink-0 place-items-center rounded-[9px] text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
