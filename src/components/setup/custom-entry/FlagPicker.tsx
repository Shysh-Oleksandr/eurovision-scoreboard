'use client';
import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useMemo, useState } from 'react';

import { PRESET_FLAGS, YourFlag } from './flags';

import { ShareSegmented } from '@/components/simulation/share/controls';
import { getFlagPath } from '@/helpers/getFlagPath';
import { playHaptic } from '@/native/haptics';
import { useCountriesStore } from '@/state/countriesStore';

export type FlagTab = 'yours' | 'presets' | 'countries';

interface FlagTile {
  flag: string;
  label: string;
  /** Matched by the search field. */
  search: string;
}

/** A long list shows this many tiles until "Show all"… */
const COLLAPSED_COUNT = 20;
/** …unless only a few more would be hidden. */
const COLLAPSE_SLACK = 4;

const STAGED = 'staged-upload';

interface FlagPickerProps {
  tab: FlagTab;
  onTabChange: (tab: FlagTab) => void;
  /** The tile in use; null while an upload or an image link is. */
  selected: string | null;
  onPick: (flag: string) => void;
  yourFlags: readonly YourFlag[];
  /** A staged upload's data URL: the first tile of Your flags, in use. */
  staged: string | null;
}

/**
 * One picker for every flag an entry can reuse: the user's own (uploads and
 * links of their other entries), the presets and the country flags, as one
 * grid of 3:2 tiles under the simulation's segmented switch. The chosen tile
 * carries the accent ring.
 */
const FlagPicker: React.FC<FlagPickerProps> = ({
  tab,
  onTabChange,
  selected,
  onPick,
  yourFlags,
  staged,
}) => {
  const t = useTranslations('setup.customCountryModal');
  const getAllCountries = useCountriesStore((state) => state.getAllCountries);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<FlagTab | null>(null);

  const countryTiles = useMemo<FlagTile[]>(
    () =>
      getAllCountries(false)
        .map((country) => ({
          flag: getFlagPath(country),
          label: country.name,
          search: country.name.toLowerCase(),
        }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [getAllCountries],
  );

  const tiles = useMemo<FlagTile[]>(() => {
    if (tab === 'presets') {
      return PRESET_FLAGS.map((preset) => ({
        flag: preset.path,
        label: t(`presetNames.${preset.key}`),
        search: '',
      }));
    }

    if (tab === 'countries') return countryTiles;

    return yourFlags.map((yourFlag) => ({
      flag: yourFlag.url,
      label: yourFlag.names.join(', '),
      search: yourFlag.names.join(' ').toLowerCase(),
    }));
  }, [countryTiles, t, tab, yourFlags]);

  const needle = query.trim().toLowerCase();
  const matching = needle
    ? tiles.filter((tile) => tile.search.includes(needle))
    : tiles;
  const collapsible = tiles.length > COLLAPSED_COUNT + COLLAPSE_SLACK;
  const collapsed = collapsible && !needle && expanded !== tab;
  let visible = collapsed ? matching.slice(0, COLLAPSED_COUNT) : matching;

  // The tile in use stays in view while the list is collapsed.
  if (
    collapsed &&
    selected &&
    !visible.some((tile) => tile.flag === selected)
  ) {
    const chosen = matching.find((tile) => tile.flag === selected);

    if (chosen) visible = [...visible.slice(0, COLLAPSED_COUNT - 1), chosen];
  }

  const showSearch = tab === 'countries' || (tab === 'yours' && collapsible);
  const showStaged = tab === 'yours' && !!staged;
  const isEmpty = visible.length === 0 && !showStaged;

  const changeTab = (next: FlagTab) => {
    setQuery('');
    onTabChange(next);
  };

  const pick = (flag: string) => {
    if (flag !== selected) playHaptic({ id: 'selection' });
    onPick(flag);
  };

  return (
    <div className="flex flex-col gap-3">
      <ShareSegmented<FlagTab>
        value={tab}
        onChange={changeTab}
        ariaLabel={t('flagSource')}
        options={[
          { value: 'yours', label: t('yourFlags') },
          { value: 'presets', label: t('presets') },
          { value: 'countries', label: t('countries') },
        ]}
      />

      {showSearch && (
        <label className="dp-search flex items-center gap-[9px] h-[42px] px-[13px] rounded-[11px]">
          <Search className="size-[17px] flex-none" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              // Enter here searches; it never saves the entry.
              if (e.key === 'Enter') e.preventDefault();
            }}
            placeholder={
              tab === 'countries' ? t('searchCountries') : t('searchYourFlags')
            }
            aria-label={
              tab === 'countries' ? t('searchCountries') : t('searchYourFlags')
            }
            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-white text-[16px] sm:text-[13px] font-semibold placeholder:text-white/40 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={t('clearSearch')}
              title={t('clearSearch')}
              className="w-[26px] h-[26px] grid place-items-center rounded-md text-white/55 hover:text-white hover:bg-white/10"
            >
              <X className="size-[15px]" />
            </button>
          )}
        </label>
      )}

      {isEmpty ? (
        <p className="text-[13px] font-semibold text-white/60 py-1">
          {needle ? t('noMatches') : t('noFlagsYet')}
        </p>
      ) : (
        <div className="dp-flag-grid">
          {showStaged && staged && (
            <span
              key={STAGED}
              role="img"
              aria-label={t('uploadedFlag')}
              title={t('uploadedFlag')}
              className="dp-flag-tile is-on"
            >
              <img src={staged} alt="" draggable={false} />
            </span>
          )}
          {visible.map((tile) => {
            const isOn = !showStaged && tile.flag === selected;

            return (
              <button
                key={tile.flag}
                type="button"
                aria-pressed={isOn}
                aria-label={tile.label}
                title={tile.label}
                onClick={() => pick(tile.flag)}
                className={`dp-flag-tile ${isOn ? 'is-on' : ''}`}
              >
                <img
                  src={tile.flag}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  onError={(e) => {
                    const fallback = getFlagPath('ww');

                    if (!e.currentTarget.src.endsWith(fallback)) {
                      e.currentTarget.src = fallback;
                    }
                  }}
                />
              </button>
            );
          })}
        </div>
      )}

      {collapsed && matching.length > visible.length && (
        <button
          type="button"
          onClick={() => setExpanded(tab)}
          className="self-start -ml-2 px-2 py-1.5 rounded-lg text-[13px] font-bold text-white/70 hover:text-white hover:bg-white/[.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          {t('showAll', { count: matching.length })}
        </button>
      )}
    </div>
  );
};

export default FlagPicker;
