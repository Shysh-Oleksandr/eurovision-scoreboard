import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import { ItemControl } from './ItemRenderer';
import { SearchGroup } from './useSettingsSearch';

interface SearchResultsProps {
  groups: SearchGroup[];
  query: string;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  groups,
  query,
}) => {
  const t = useTranslations();

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-white/50">
        <Search size={28} />
        <p className="text-[13.5px]">
          {t('settings.general2.noResults', { query })}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {groups.map((group) => {
        const Icon = group.category.icon;

        return (
          <div key={group.category.id}>
            <div className="mb-1 flex items-center gap-2 px-3 text-[12px] font-extrabold uppercase tracking-[0.05em] text-white/45">
              <Icon size={14} className="shrink-0" />
              <span>{t(group.category.titleKey)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              {group.matches.map((item) => (
                <ItemControl key={item.id} item={item} query={query} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
