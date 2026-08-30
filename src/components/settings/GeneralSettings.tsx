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
import {
  GeneralSettingsCategoryId,
  useGeneralStore,
} from '@/state/generalStore';
import { customThemeHasSimulationBackground } from '@/theme/customThemeHasAudio';

const CATEGORY_IDS = new Set(CATEGORIES.map((category) => category.id));
const DEFAULT_CATEGORY_ID = CATEGORIES[0].id;

const resolveCategory = (id: string | undefined): string =>
  id && CATEGORY_IDS.has(id) ? id : DEFAULT_CATEGORY_ID;

export const GeneralSettings: React.FC = () => {
  const lastOpenedGeneralSettingsCategory = useGeneralStore(
    (state) => state.settings.lastOpenedGeneralSettingsCategory,
  );
  const setSettings = useGeneralStore((state) => state.setSettings);
  const [query, setQuery] = useState('');
  // Search can temporarily highlight a matching category without persisting it.
  const [searchHighlight, setSearchHighlight] = useState<string | null>(null);
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
  const persistedCategory = resolveCategory(lastOpenedGeneralSettingsCategory);
  const activeCategory = searchHighlight ?? persistedCategory;

  const persistCategory = (id: string) => {
    setSearchHighlight(null);

    if (!CATEGORY_IDS.has(id) || id === lastOpenedGeneralSettingsCategory) {
      return;
    }

    setSettings({
      lastOpenedGeneralSettingsCategory: id as GeneralSettingsCategoryId,
    });
  };

  // In search mode, keep the highlighted category following the first match.
  useEffect(() => {
    if (!search.active) {
      setSearchHighlight(null);

      return;
    }

    if (
      search.groups.length > 0 &&
      !search.groups.some((group) => group.category.id === activeCategory)
    ) {
      setSearchHighlight(search.groups[0].category.id);
    }
  }, [search, activeCategory]);

  const activeCat =
    CATEGORIES.find((category) => category.id === activeCategory) ??
    CATEGORIES[0];

  const selectAndClear = (id: string) => {
    persistCategory(id);
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
            onSelect={persistCategory}
          />
          <CategoryPane key={activeCat.id} category={activeCat} env={env} />
        </>
      ) : (
        <div className="grid grid-cols-[200px_1fr] items-start gap-[18px]">
          <SidebarNav
            categories={CATEGORIES}
            activeId={activeCategory}
            onSelect={persistCategory}
          />
          <CategoryPane key={activeCat.id} category={activeCat} env={env} />
        </div>
      )}
    </div>
  );
};
