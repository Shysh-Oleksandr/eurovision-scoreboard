import { useTranslations } from 'next-intl';
import React from 'react';

import { Category } from './model/types';

interface SubTabStripProps {
  categories: Category[];
  activeId: string;
  onSelect: (id: string) => void;
}

export const SubTabStrip: React.FC<SubTabStripProps> = ({
  categories,
  activeId,
  onSelect,
}) => {
  const t = useTranslations();

  return (
    <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {categories.map((category) => {
        const Icon = category.icon;
        const active = category.id === activeId;

        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category.id)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-[12.5px] font-bold transition-colors ${
              active
                ? 'bg-gradient-to-b from-primary-700 to-primary-800 text-white'
                : 'border border-white/10 bg-white/[0.04] text-white/55'
            }`}
          >
            <Icon size={16} className="shrink-0" />
            <span>{t(category.titleKey)}</span>
          </button>
        );
      })}
    </div>
  );
};
