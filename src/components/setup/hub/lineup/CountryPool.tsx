'use client';
import { ChevronDown, Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React, { useEffect, useState } from 'react';

import { useSetupUiStore } from '../state/setupUiStore';

import { useDndComponents } from './dnd/DndComponentsContext';
import { headerToggleHandler } from './headerToggle';
import { useLineupModelContext } from './LineupProvider';
import { POOL_ROOT_LIST } from './listIds';
import PoolCategory from './PoolCategory';
import { useLineupSearch } from './useLineupSearch';

interface CountryPoolProps {
  isSignedIn: boolean;
}

/**
 * The single collapsible pool of countries that are not participating:
 * search, one collapsible category per region, Custom (with groups) and
 * Imported. Dropping anywhere on it sends a country back to its home category.
 */
const CountryPool: React.FC<CountryPoolProps> = ({ isSignedIn }) => {
  const t = useTranslations('setup.eventSetupModal');
  const { DropZone } = useDndComponents();
  const { pool, counts } = useLineupModelContext();
  const poolOpen = useSetupUiStore((state) => state.poolOpen);
  const setPoolOpen = useSetupUiStore((state) => state.setPoolOpen);
  const setSearch = useSetupUiStore((state) => state.setSearch);
  const { search, matches } = useLineupSearch();
  const [hasBeenOpened, setHasBeenOpened] = useState(poolOpen);

  // A search always shows the pool contents.
  const open = poolOpen || matches !== null;

  useEffect(() => {
    if (open) setHasBeenOpened(true);
  }, [open]);

  return (
    <DropZone
      id={POOL_ROOT_LIST}
      as="section"
      className="dp-pool rounded-[14px] overflow-hidden"
    >
      <div
        className="flex items-center gap-[11px] px-3.5 py-[13px] flex-wrap cursor-pointer select-none"
        onClick={headerToggleHandler(() => setPoolOpen(!poolOpen))}
      >
        <button
          type="button"
          onClick={() => setPoolOpen(!poolOpen)}
          aria-expanded={open}
          className="flex items-center gap-[11px] min-w-0 text-left text-white"
        >
          <ChevronDown
            className={`size-[19px] flex-none text-white/70 transition-transform duration-200 ${
              open ? '' : '-rotate-90'
            }`}
          />
          <span className="min-w-0">
            <span className="block text-lg font-extrabold tracking-[-.02em]">
              {t('countryPool')}
            </span>
            <span className="block text-[11.5px] font-bold text-white/55 mt-px">
              {t('countryPoolSub', { count: counts.pool })}
            </span>
          </span>
        </button>
        <label className="dp-search ml-auto flex items-center gap-[9px] h-[42px] px-[13px] rounded-[11px] w-full max-w-none 2cols:max-w-[260px]">
          <Search className="size-[17px] flex-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchCountries')}
            aria-label={t('searchCountries')}
            className="flex-1 min-w-0 bg-transparent border-0 outline-none text-white text-[16px] sm:text-[13px] font-semibold placeholder:text-white/40 [&::-webkit-search-cancel-button]:hidden"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label={t('noMatches')}
              className="w-[26px] h-[26px] grid place-items-center rounded-md text-white/55 hover:text-white hover:bg-white/10"
            >
              <X className="size-[15px]" />
            </button>
          )}
        </label>
      </div>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-in-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="min-h-0 overflow-hidden">
          {hasBeenOpened && (
            <div className="flex flex-col gap-2 px-3 pb-3">
              {pool.map((entry) => (
                <PoolCategory
                  key={entry.category}
                  entry={entry}
                  isSignedIn={isSignedIn}
                  matches={matches}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DropZone>
  );
};

export default CountryPool;
