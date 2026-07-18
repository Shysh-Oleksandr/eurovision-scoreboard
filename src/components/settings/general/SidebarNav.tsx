import { useTranslations } from 'next-intl';
import React from 'react';

import { Category } from './model/types';

interface SidebarNavProps {
  categories: Category[];
  activeId: string;
  counts?: Record<string, number>;
  onSelect: (id: string) => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  categories,
  activeId,
  counts,
  onSelect,
}) => {
  const t = useTranslations();

  return (
    <nav className="sticky top-[52px] flex flex-col gap-[3px] self-start">
      {categories.map((category) => {
        const Icon = category.icon;
        const active = category.id === activeId;
        const count = counts?.[category.id];

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category.id)}
            className={`relative flex items-center gap-[11px] rounded-[10px] px-3 py-2.5 text-left text-[13.5px] font-bold transition-colors ${
              active
                ? 'bg-gradient-to-r from-primary-700/50 to-primary-700/5 text-white'
                : 'text-white/55 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            {active && (
              <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-primary-700" />
            )}
            <Icon size={17} className="shrink-0" />
            <span className="flex-1 truncate">{t(category.titleKey)}</span>
            {count !== undefined && (
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-bold text-white">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
