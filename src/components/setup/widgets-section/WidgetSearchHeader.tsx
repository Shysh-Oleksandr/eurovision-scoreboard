'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import React from 'react';

import SearchInputIcon from '../SearchInputIcon';

import { cn } from '@/helpers/utils';

interface WidgetSearchHeaderProps {
  search: string;
  onSearchChange: (search: string) => void;
  onCreateNew?: () => void;
  placeholder: string;
  extraActions?: React.ReactNode;
}

const WidgetSearchHeader: React.FC<WidgetSearchHeaderProps> = ({
  onCreateNew,
  search,
  onSearchChange,
  placeholder,
  extraActions,
}) => {
  const t = useTranslations();

  return (
    <div className="flex sm:flex-row flex-col gap-2.5 items-stretch">
      <div className="relative sm:flex-1 flex-none">
        <input
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-black/[0.28] border border-white/[0.10] rounded-[12px] px-4 py-[13px] pr-11 text-[15px] text-white placeholder:text-white/40 outline-none transition-[border-color,box-shadow] focus:border-primary-700/50 focus:shadow-[0_0_0_3px_rgba(0,0,0,0.18)]"
        />
        <SearchInputIcon
          showClearIcon={search.length > 0}
          onClick={() => search.length > 0 && onSearchChange('')}
        />
      </div>

      <div
        className={cn(
          'flex items-center gap-2 flex-shrink-0',
          onCreateNew && extraActions && 'flex-row-reverse sm:flex-row',
        )}
      >
        {extraActions}
        {onCreateNew && (
          <button
            type="button"
            onClick={onCreateNew}
            className="inline-flex w-full items-center gap-2 h-[46px] px-[18px] rounded-[12px] border border-white/[0.16] text-white text-[14px] font-bold whitespace-nowrap justify-center transition-[filter] hover:brightness-110"
            style={{
              background:
                'linear-gradient(180deg, hsl(var(--twc-primary-750)), hsl(var(--twc-primary-800)))',
            }}
          >
            <Plus className="w-[18px] h-[18px]" />
            {t('common.create')}
          </button>
        )}
      </div>
    </div>
  );
};

export default WidgetSearchHeader;
