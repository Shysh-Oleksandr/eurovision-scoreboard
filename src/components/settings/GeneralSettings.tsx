'use client';
import React, { useEffect, useMemo, useState } from 'react';

import { CategoryPane } from './general/CategoryPane';
import { CATEGORIES } from './general/model/settingsModel';
import { SearchResults } from './general/SearchResults';
import { SettingsSearchBar } from './general/SettingsSearchBar';
import { SidebarNav } from './general/SidebarNav';
import { SubTabStrip } from './general/SubTabStrip';
import { useSettingsSearch } from './general/useSettingsSearch';

import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useGeneralStore } from '@/state/generalStore';
import { customThemeHasSimulationBackground } from '@/theme/customThemeHasAudio';

export const GeneralSettings: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('contest');
  const [query, setQuery] = useState('');
  const isMobile = useMediaQuery('(max-width: 720px)');

  const customTheme = useGeneralStore((s) => s.customTheme);
  const env = useMemo(
    () => ({
      fullscreenEnabled:
        typeof document !== 'undefined' && document.fullscreenEnabled,
      hasSimBg: customThemeHasSimulationBackground(customTheme),
    }),
    [customTheme],
  );

  const search = useSettingsSearch(CATEGORIES, query, env);

  // In search mode, keep the highlighted category following the first match.
  useEffect(() => {
    if (
      search.active &&
      search.groups.length > 0 &&
      !search.groups.some((group) => group.category.id === activeCategory)
    ) {
      setActiveCategory(search.groups[0].category.id);
    }
  }, [search, activeCategory]);

  const activeCat =
    CATEGORIES.find((category) => category.id === activeCategory) ??
    CATEGORIES[0];

  const selectAndClear = (id: string) => {
    setActiveCategory(id);
    setQuery('');
  };

  return (
    <div className="flex flex-col gap-1 text-white">
      <SettingsSearchBar value={query} onChange={setQuery} />

      {search.active ? (
        isMobile ? (
          <SearchResults groups={search.groups} query={query} />
        ) : (
          <div className="grid grid-cols-[200px_1fr] items-start gap-[18px]">
            <SidebarNav
              categories={search.groups.map((group) => group.category)}
              counts={search.counts}
              activeId={activeCategory}
              onSelect={selectAndClear}
            />
            <SearchResults groups={search.groups} query={query} />
          </div>
        )
      ) : isMobile ? (
        <>
          <SubTabStrip
            categories={CATEGORIES}
            activeId={activeCategory}
            onSelect={setActiveCategory}
          />
          <CategoryPane key={activeCat.id} category={activeCat} env={env} />
        </>
      ) : (
        <div className="grid grid-cols-[200px_1fr] items-start gap-[18px]">
          <SidebarNav
            categories={CATEGORIES}
            activeId={activeCategory}
            onSelect={setActiveCategory}
          />
          <CategoryPane key={activeCat.id} category={activeCat} env={env} />
        </div>
      )}
    </div>
  );
};
